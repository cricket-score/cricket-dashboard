// Platform-independent request handling, tested by Vitest.
import { updateSchema, validateUpdate } from './scoring.generated.ts';

type MatchData = Parameters<typeof validateUpdate>[0];
export type Services = {
  authorize: (token: string) => Promise<boolean>;
  read: () => Promise<{data: MatchData; revision: number; operation_id: string | null} | null>;
  save: (data: MatchData, revision: number, operation: string) => Promise<unknown>;
};
export function makeHandler(services: Services) {
  return async (request: Request) => {
    // Bearer authentication, no cookies. CORS is not used as an authorization boundary.
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    try {
      const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!token || !await services.authorize(token)) return reply({ error: 'Sign in with the scorer account before saving. Your pending action is still on this device.' }, 401);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 1_500_000) return reply({ error: 'Match is too large' }, 413);
      let body: unknown;
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400); }
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) return reply({ error: parsed.error.issues[0]?.message || 'Invalid match' }, 400);
      const { data, revision, operationId } = parsed.data;
      const old = await services.read();
      if (old?.operation_id === operationId) return reply(await services.save(data, revision, operationId));
      if ((old?.revision ?? 0) !== revision) return reply({ error: 'Another save changed the match. Discard the pending action and reload the latest score.' }, 409);
      try { validateUpdate(old?.data ?? { ...data, events: [] }, data); }
      catch (error) { return reply({ error: error instanceof Error ? error.message : 'Invalid scoring event' }, 400); }
      return reply(await services.save(data, revision, operationId));
    } catch (error) {
      if (error instanceof Error && error.message.includes('CONFLICT')) return reply({ error: 'Another save changed the match. Reload before trying again.' }, 409);
      // Never send SDK errors or credentials to the browser.
      return reply({ error: 'Unable to save to Supabase. Retry your pending action.' }, 503);
    }
  };
}
