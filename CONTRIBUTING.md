# Contributing

Thanks for your interest in contributing to Claude Leaderboard!

This project is maintained as a self-hosted open-source app, while also powering a live internal deployment. Changes should improve the reusable product without breaking the current production behavior.

## Local setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your values (see README for setup guides)
4. Validate your config: `set -a && source .env.local && npm run validate:env`
5. Run the Supabase migration in `supabase-migration.sql` against your project
6. Start the dev server: `npm run dev`

For the full operator path, see [docs/self-hosting.md](docs/self-hosting.md).

## Project shape

- `app/` contains the Next.js App Router pages and route handlers
- `lib/` contains auth, sync, and leaderboard logic
- `public/sync.py` is the client-side collector installed onto user machines
- `supabase/migrations/` is the preferred schema source for new self-hosted setups
- `supabase-migration.sql` is the compatibility snapshot of the current schema
- `docs/` holds operator notes, rollout guides, and portfolio-facing writeups

## Making changes

- Keep PRs small and focused on a single concern
- Run `npm run lint` before opening a PR
- Run `npm run typecheck` for TypeScript changes
- Run `npm test` when touching leaderboard math or sync payload handling
- Run `npm run build` for routing, deployment, or config changes
- If adding a new env var, add it to `.env.example` with a comment
- If changing leaderboard math or sync behavior, update the relevant docs in `README.md` or `docs/`

## Design constraints

- Preserve the current raw-event ingestion model unless there is a strong reason to replace it
- Avoid client-reported aggregate stats; the server should remain the source of truth
- Keep reset, rebuild, and rescan behavior explicit and operator-friendly
- Prefer packaging improvements over product forks when making the project easier to distribute

## Reporting issues

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
