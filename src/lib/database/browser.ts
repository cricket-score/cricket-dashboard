import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { defaultMatch, type Match, type RecordData } from '../scoring/model';

export const hostedBackend = process.env.NEXT_PUBLIC_BACKEND === 'supabase';
export const scorerEmail = process.env.NEXT_PUBLIC_SCORER_EMAIL || 'scorer@boundary.invalid';
export const sitePath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${path}`;
let client: SupabaseClient | undefined;
export function browserDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('The site is missing its public Supabase configuration.');
  return client ??= createClient(url, key);
}
async function jsonResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}
export async function loadMatch(): Promise<RecordData & { local?: boolean }> {
  if (!hostedBackend) return jsonResponse(await fetch('/api/match', { cache: 'no-store' }));
  const { data, error } = await browserDatabase().from('matches').select('*').eq('id', 'school-match').maybeSingle();
  if (error) throw new Error('Cannot load the match from Supabase. Check your connection and retry.');
  return data ?? { id: 'school-match', revision: 0, data: defaultMatch(), updated_at: new Date().toISOString(), operation_id: null };
}
export async function persistMatch(pending: { data: Match; revision: number; operationId: string }): Promise<RecordData> {
  if (!hostedBackend) return jsonResponse(await fetch('/api/match', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) }));
  const db = browserDatabase();
  const { data: { session }, error } = await db.auth.getSession();
  if (error || !session) throw new Error('Your scorer session expired. Sign in again; the pending action is saved on this device.');
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/score-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(pending),
  });
  return jsonResponse(response);
}
export async function isScorer() {
  if (!hostedBackend) return (await jsonResponse(await fetch('/api/session'))).authenticated as boolean;
  const { data, error } = await browserDatabase().auth.getUser();
  return !error && data.user?.app_metadata?.cricket_role === 'scorer';
}
export async function signInScorer(password: string) {
  if (!hostedBackend) { await jsonResponse(await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })); return; }
  const { data, error } = await browserDatabase().auth.signInWithPassword({ email: scorerEmail, password });
  if (error) throw new Error('Unable to sign in. Check the scorer password and your connection.');
  if (data.user?.app_metadata?.cricket_role !== 'scorer') {
    await browserDatabase().auth.signOut();
    throw new Error('This account does not have scorer access.');
  }
}
export async function signOutScorer() {
  if (!hostedBackend) { await jsonResponse(await fetch('/api/session', { method: 'DELETE' })); return; }
  const { error } = await browserDatabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}
