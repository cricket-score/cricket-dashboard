import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) throw new Error('Base path must be empty or /repository-name');
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
// A separate build directory avoids overwriting the running local dev server's assets.
// Only the static app is copied. No API routes, local environment files or server keys.
const stage = path.resolve('.pages-build');
await mkdir(stage, { recursive: true });
await cp('src', path.join(stage, 'src'), { recursive: true, filter: p => !['src/app/api', 'src/lib/auth.ts', 'src/lib/database/store.ts'].includes(p) });
for (const name of ['public', 'package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.mjs', 'eslint.config.mjs']) {
  await cp(name, path.join(stage, name), { recursive: true });
}
const config = JSON.parse(await readFile(path.join(stage, 'tsconfig.json'), 'utf8'));
config.exclude = ['node_modules'];
await writeFile(path.join(stage, 'tsconfig.json'), JSON.stringify(config));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(SUPABASE_|ADMIN_PASSWORD|SESSION_SECRET|LOCAL_DEMO|GITHUB_TOKEN|GH_TOKEN)/.test(key)));
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', stage], {
  stdio: 'inherit', env: { ...env, PAGES_EXPORT: 'true', NEXT_PUBLIC_BACKEND: 'supabase', NEXT_PUBLIC_BASE_PATH: basePath },
});
if (result.status !== 0) process.exit(result.status || 1);
await writeFile(path.join(stage, 'out', '.nojekyll'), '');
console.log('Static site ready: .pages-build/out');
