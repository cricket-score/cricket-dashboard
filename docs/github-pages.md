# GitHub Pages + Supabase

The published app is a static Next.js export. It works from any internet connection, with the development computer switched off. Parents need no account. The scorer continues to enter one password.

## Security architecture

Public reads use the Supabase anon key and the table's SELECT policy. Scorer login uses Supabase Auth and the internal account identifier `scorer@boundary.invalid` (no email is sent). The Edge Function verifies the user token with Supabase Auth and requires server-controlled `app_metadata.cricket_role = scorer`. It validates the complete event history using the same engine as the frontend and calls `save_match` with the service role. Anonymous users and signed-in users cannot call this privileged RPC directly.

`verify_jwt=false` in the function configuration disables the gateway's legacy JWT verification, not the function's authentication. Every write still requires a valid scorer token. CORS allows the static frontend to call the function; bearer authentication, not CORS, protects writes.

Do not upload `.env.local`, admin passwords, session secrets, service-role keys or management tokens. Only the project URL, public anon key and optional scorer identifier are browser configuration. A source repository being public does not expose secrets that are excluded from it.

## Backend setup

1. Run `supabase/schema.sql` in the Supabase SQL editor. It creates the read-only public policy, service-role-only save RPC and Realtime publication. Never add public write policies.
2. Put the project URL, public key and server-only service-role key in `.env.local`.
3. Run `npm run scorer:provision`. It creates a single confirmed scorer account. If the practice password is shorter than 12 characters, the script generates a strong one and saves it privately as `ADMIN_PASSWORD` in `.env.local`. Existing accounts and passwords are preserved on repeat runs.
4. Deploy the function:

```sh
npx supabase login
npm run bundle:edge
npx supabase functions deploy score-match --project-ref YOUR_PROJECT_REF --use-api
```

Supabase provides the server keys to the function automatically. Rebuild and redeploy the function after modifying the scoring engine or validation. Changing `.env.local` does not reset an already-created Supabase Auth password.

## Publishing

Use Node 22 for builds. GitHub repository Settings → Pages must use **GitHub Actions**. `.github/workflows/pages.yml` runs on pushes to `main`. Configure Actions **variables** (these are public configuration):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional `NEXT_PUBLIC_SCORER_EMAIL`, default `scorer@boundary.invalid`

No private secrets are required by this workflow. It derives the repository path automatically. A local equivalent is:

```sh
npm ci
NEXT_PUBLIC_BASE_PATH=/cricket-dashboard npm run build:pages
```

Publish `.pages-build/out`, not the source directory. The export excludes the local Next.js API routes and all server credentials. Builds use a separate directory to avoid breaking a running local dev server's CSS and scripts. HTTPS is supplied by GitHub Pages.

## Verification and match-day rehearsal

```sh
npm run bundle:edge
npm run typecheck
npm run lint
npm test
NEXT_PUBLIC_BASE_PATH=/cricket-dashboard npm run build:pages
```

The optional deployed integration test signs in, checks public and signed-in write restrictions, re-saves existing match data unchanged, confirms retry idempotency and receives an anonymous Realtime update. It initializes a two-over test match only when no database row exists:

```sh
RUN_HOSTED_TEST=true npx vitest run tests/hosted.test.ts
```

Before match day, score a practice over on a phone using mobile data while another device watches `/live/`. Confirm scores appear without a refresh. GitHub Pages serves the app; Supabase must remain available. Free projects may pause after inactivity, so check the Supabase dashboard and both phone URLs before the event.

## Recovery

An unsaved action remains on the scorer's device and blocks further scoring. Retry it after reconnecting. If there is a revision conflict, inspect the latest server score, discard the stale pending action and record any missing ball. Use one scorer tab at a time.

Export the completed match from **Match info** before resetting for another match. **More → Reset match** requires typing `RESET`. The same public URL shows the completed match until it is reset. Keep the exported JSON as an independent archive; free hosting is subject to provider availability and retention policies.
