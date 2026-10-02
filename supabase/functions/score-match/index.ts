import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { makeHandler } from './handler.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(makeHandler({
  async authorize(token) {
    const { data, error } = await db.auth.getUser(token);
    return !error && data.user?.app_metadata?.cricket_role === 'scorer';
  },
  async read() {
    const { data, error } = await db.from('matches').select('data, revision, operation_id').eq('id', 'school-match').maybeSingle();
    if (error) throw error;
    return data;
  },
  async save(data, revision, operation) {
    const { data: row, error } = await db.rpc('save_match', { p_data: data, p_revision: revision, p_operation: operation });
    if (error) throw new Error(error.message);
    return row;
  },
}));
