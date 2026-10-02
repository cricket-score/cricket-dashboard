import { it, expect } from 'vitest';
import { createClient, type WebSocketLikeConstructor } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defaultMatch } from '../src/lib/scoring/model';

// Explicit opt-in: verifies the deployed backend. Re-saves existing data unchanged,
// or initializes an empty test match when no row exists. Never resets a match.
it.skipIf(process.env.RUN_HOSTED_TEST !== 'true')('deployed scorer login, secure save, idempotency and public realtime', async () => {
  Object.assign(process.env, parseEnv(readFileSync('.env.local', 'utf8')));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket as unknown as WebSocketLikeConstructor } };
  const scorer = createClient(url, key, options), viewer = createClient(url, key, options);
  const { data: auth, error: loginError } = await scorer.auth.signInWithPassword({ email: process.env.NEXT_PUBLIC_SCORER_EMAIL || 'scorer@boundary.invalid', password: process.env.ADMIN_PASSWORD! });
  expect(loginError?.message).toBeUndefined(); expect(auth.user?.app_metadata.cricket_role).toBe('scorer');
  const { data: old, error: readError } = await viewer.from('matches').select('*').eq('id', 'school-match').maybeSingle();
  expect(readError?.message).toBeUndefined();
  const data = old?.data ?? defaultMatch();
  if (!old) { data.config.title = 'School Cricket · Test Match'; data.config.overs = 2; }
  const revision = old?.revision ?? 0, operationId = crypto.randomUUID();
  const request = { data, revision, operationId };
  const endpoint = `${url}/functions/v1/score-match`;
  const post = (token?: string) => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(request) });
  const denied = await post(); expect(denied.status).toBe(401);
  const rpc = await viewer.rpc('save_match', { p_data: data, p_revision: revision, p_operation: operationId });
  expect(rpc.error).not.toBeNull();
  // Even a signed-in scorer must use server validation, never the privileged RPC.
  const direct = await scorer.rpc('save_match', { p_data: data, p_revision: revision, p_operation: operationId });
  expect(direct.error).not.toBeNull();
  let receive!: (revision: number) => void;
  const received = new Promise<number>(resolve => { receive = resolve; });
  const channel = viewer.channel(`deployment-check-${operationId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: 'id=eq.school-match' }, payload => {
    if ('revision' in payload.new) receive(payload.new.revision);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Realtime subscription timed out')), 15000);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error('Realtime subscription failed')); }
      });
    });
    const saved = await post(auth.session!.access_token);
    const result = await saved.json();
    expect(result.error).toBeUndefined(); expect(saved.status).toBe(200); expect(result.revision).toBe(revision + 1);
    expect(await Promise.race([received, new Promise(resolve => setTimeout(() => resolve('timeout'), 15000))])).toBe(revision + 1);
    const retry = await post(auth.session!.access_token); const retried = await retry.json();
    expect(retry.status).toBe(200); expect(retried.revision).toBe(revision + 1);
    const latest = await viewer.from('matches').select('data, revision').eq('id', 'school-match').single();
    expect(latest.data?.revision).toBe(revision + 1); expect(latest.data?.data).toEqual(data);
  } finally {
    await viewer.removeChannel(channel);
    await scorer.auth.signOut();
  }
}, 45000);
