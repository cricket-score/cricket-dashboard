import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
let password = process.env.ADMIN_PASSWORD;
const email = process.env.NEXT_PUBLIC_SCORER_EMAIL || 'scorer@boundary.invalid';
if (!url || !key) {
  throw new Error('Set the Supabase URL and server service-role key in .env.local.');
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } });
// Do not overwrite an existing account or password on a repeat run.
let existing;
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error('Cannot access Supabase Auth admin. Check the local server key.');
  existing = data.users.find(user => user.email === email);
  if (existing || data.users.length < 100) break;
}
if (existing) {
  if (existing.app_metadata?.cricket_role !== 'scorer') throw new Error('The matching account exists without scorer access; no permissions were changed.');
  console.log('Scorer account already exists. Password and permissions were preserved.');
} else {
  const generated = !password || password.length < 12;
  if (generated) password = randomBytes(24).toString('base64url');
  const { error } = await db.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { cricket_role: 'scorer' } });
  if (error) throw new Error('Scorer creation failed. Check Supabase Auth configuration.');
  if (generated) {
    const filename = '.env.local';
    const contents = await readFile(filename, 'utf8');
    await writeFile(filename, /^ADMIN_PASSWORD=.*$/m.test(contents) ? contents.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`) : `${contents}\nADMIN_PASSWORD=${password}\n`, { mode: 0o600 });
    console.log('Replaced the short practice password with a generated password in .env.local (not printed).');
  }
  console.log('Created the single scorer account. Use ADMIN_PASSWORD from .env.local; no email was sent.');
}
