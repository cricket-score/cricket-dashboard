# Boundary · School Cricket Live

A lightweight live scoring app for one school T20 match. The scorer uses `/admin` on a phone, parents watch `/live`, and `/setup` is used before match day.

## Stack and data model

Next.js, React, TypeScript, custom CSS, GitHub Pages and Supabase. GitHub serves the static interface; Supabase Auth handles scorer login; the `score-match` Edge Function validates scoring events before saving. Supabase Postgres and Realtime persist and broadcast the score. The app stores one match record containing configuration and an ordered event log. The deterministic engine in `src/lib/scoring/engine.ts` rebuilds totals, strike, scorecards, targets, results, undo and corrections from those events.

Public match: https://shaluka-ranwalage.github.io/cricket-dashboard/live/

Scorer: https://shaluka-ranwalage.github.io/cricket-dashboard/admin/

Setup: https://shaluka-ranwalage.github.io/cricket-dashboard/setup/

See [GitHub Pages deployment](docs/github-pages.md) for the full hosting, security and maintenance instructions. The computer does not need to stay on for the public site.

Normal runs are one tap. Wides, no-balls, byes, leg-byes, wickets, retirements, bowler changes, and corrections use guided dialogs. The local practice mode writes to `.data/match.json`, which is useful for trying the scorer before connecting Supabase.

## Local setup

```bash
npm install
cp .env.example .env.local
# set LOCAL_DEMO=true for a no-account local practice match
npm run dev
```

Open `http://localhost:3000/live`. The scorer password is required for `/setup` and `/admin`; in local practice set `ADMIN_PASSWORD` and `SESSION_SECRET` in `.env.local`.

Local environment variables (never commit `.env.local`):

```text
ADMIN_PASSWORD=strong-private-password
SESSION_SECRET=openssl-rand-hex-32-or-longer
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
LOCAL_DEMO=false
```

Never use `NEXT_PUBLIC_` for the service role key, admin password, or session secret.

## Supabase setup

1. Create a free Supabase project.
2. Open SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the match table, public read policy, atomic revision-checked save function, and Realtime publication.
3. Copy the project URL, publishable anon key, and service role key into the deployment environment.
4. Confirm the `matches` table has Realtime enabled and that the browser can read one row after the first save.

The server uses the service role only for the atomic save RPC. Parents can read the scoreboard anonymously; they cannot write match data.

## Deploy on GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds and publishes on pushes to `main`. GitHub needs only the public project URL and anon key as Actions variables. The service-role key and scorer password stay out of GitHub. Deploy the Supabase scoring function separately after scoring-engine changes; see [deployment instructions](docs/github-pages.md).

The production scorer uses Supabase Auth. Its initial password is stored privately in the organizer's `.env.local` as `ADMIN_PASSWORD`. Updating that variable alone does not reset an existing Supabase account's password. Normal local development retains the original server routes; set `NEXT_PUBLIC_BACKEND=supabase` to test the hosted backend locally.

## Match-day scorer guide

1. Open `/admin` and enter the scorer password.
2. On `/setup`, confirm teams, exactly 11 player names, toss, venue, date, and overs.
3. Choose the striker, non-striker, and opening bowler. Press **Start innings**.
4. Tap `0`, `1`, `2`, `3`, `4`, or `6` for ordinary balls. Use **WIDE**, **NO BALL**, **EXTRAS**, or **WICKET** for unusual deliveries.
5. After six legal balls, choose the next bowler. Strike changes automatically; **More → Swap strike** is available for an umpire correction.
6. Use **Undo last ball** immediately if a delivery was entered incorrectly. Use **More → Recent deliveries / corrections** for an older mistake.
7. End the innings when needed. The target and chase equation are calculated automatically.
8. At the end, confirm **Finish match**. A tie can be ended as a tie or continued as a six-ball Super Over.

If the connection drops, scoring pauses with an obvious save warning. Retry the pending action before continuing; do not record another ball while a save is unresolved.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
NEXT_PUBLIC_BASE_PATH=/cricket-dashboard npm run build:pages
```

The scoring suite covers ordinary runs, strike rotation, legal-ball overs, wides, no-balls, byes, leg-byes, wickets, run-outs, retirements, undo, corrections, innings results, ties, and Super Overs.

## Known limitations

This intentionally supports one match at a time. There is no account system, umpire review workflow, multiple simultaneous matches, or arbitrary manual total editing. For an event, export the completed JSON archive from the public match info tab and retain a copy of the Supabase project.
