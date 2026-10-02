import { describe, it, expect, vi } from 'vitest';
import { makeHandler, type Services } from '../supabase/functions/score-match/handler';
import { defaultMatch } from '../src/lib/scoring/model';
import { append } from '../src/lib/scoring/engine';

const operationId = '38c419c3-1462-4f14-b1c5-ef5558da89fd';
const body = () => ({ data: defaultMatch(), revision: 0, operationId });
function setup(allowed = true, old: Awaited<ReturnType<Services['read']>> = null) {
  const save = vi.fn(async (data, revision, operation_id) => ({ id: 'school-match', data, revision: revision + 1, operation_id }));
  const services: Services = { authorize: vi.fn(async () => allowed), read: vi.fn(async () => old), save };
  const request = (data: unknown = body(), method = 'POST', token = 'valid') => new Request('https://project.supabase.co/functions/v1/score-match', {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(data) : undefined,
  });
  return { handle: makeHandler(services), services, request, save };
}
describe('GitHub Pages scoring backend', () => {
  it('allows CORS preflight without authorizing a write', async () => {
    const t = setup(); const response = await t.handle(t.request(undefined, 'OPTIONS'));
    expect(response.status).toBe(204); expect(t.services.authorize).not.toHaveBeenCalled(); expect(t.save).not.toHaveBeenCalled();
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
  });
  it('rejects an anonymous or non-scorer session before any database reads', async () => {
    const t = setup(false); expect((await t.handle(t.request())).status).toBe(401);
    expect(t.services.read).not.toHaveBeenCalled(); expect(t.save).not.toHaveBeenCalled();
  });
  it('rejects missing bearer tokens', async () => {
    const t = setup(); const req = t.request(); req.headers.delete('Authorization');
    expect((await t.handle(req)).status).toBe(401); expect(t.save).not.toHaveBeenCalled();
  });
  it('validates and saves a match with the expected revision', async () => {
    const t = setup(); const response = await t.handle(t.request());
    expect(response.status).toBe(200); expect((await response.json()).revision).toBe(1); expect(t.save).toHaveBeenCalledOnce();
  });
  it('rejects impossible deliveries even when authenticated', async () => {
    const t = setup(), data = body(); data.data.events.push({ kind: 'ball', id: 'bad', at: '', bat: 4, extra: 'none', extraRuns: 0 });
    const response = await t.handle(t.request(data)); expect(response.status).toBe(400); expect(t.save).not.toHaveBeenCalled();
  });
  it('rejects stale revisions before saving', async () => {
    const t = setup(true, { data: defaultMatch(), revision: 2, operation_id: null });
    expect((await t.handle(t.request())).status).toBe(409); expect(t.save).not.toHaveBeenCalled();
  });
  it('delegates retried operation IDs to the idempotent database RPC', async () => {
    const t = setup(true, { data: defaultMatch(), revision: 1, operation_id: operationId });
    expect((await t.handle(t.request())).status).toBe(200); expect(t.save).toHaveBeenCalledOnce();
  });
  it('keeps playing rules locked after the first innings starts', async () => {
    const data = append(defaultMatch(), { kind: 'start', id: 'start', at: '', striker: 'blue-1', nonStriker: 'blue-2', bowler: 'red-1' });
    const t = setup(true, { data, revision: 1, operation_id: null });
    const next = structuredClone(data); next.config.overs = 10;
    expect((await t.handle(t.request({ data: next, revision: 1, operationId }))).status).toBe(400); expect(t.save).not.toHaveBeenCalled();
  });
  it('does not expose internal errors to the client', async () => {
    const t = setup(); t.save.mockRejectedValueOnce(new Error('PRIVATE_DATABASE_INFORMATION'));
    const response = await t.handle(t.request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('PRIVATE_DATABASE_INFORMATION');
  });
  it('maps concurrent database conflicts to HTTP 409', async () => {
    const t = setup(); t.save.mockRejectedValueOnce(new Error('CONFLICT'));
    expect((await t.handle(t.request())).status).toBe(409);
  });
  it('rejects oversized requests and invalid JSON', async () => {
    const t = setup(); const req = new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: 'x'.repeat(1_500_001) });
    expect((await t.handle(req)).status).toBe(413); expect(t.save).not.toHaveBeenCalled();
    expect((await t.handle(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: '{' }))).status).toBe(400);
  });
});
