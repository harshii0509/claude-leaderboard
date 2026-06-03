# Contributing

Thanks for your interest in contributing to Claude Leaderboard!

This project is maintained as a self-hosted open-source app, while also powering a live internal deployment. Changes should improve the reusable product without breaking the current production behavior.

## Branch and deployment flow

This repo uses a three-branch operating model:

- `experimentation` is the local-first branch for rough ideas and product exploration
- `internal` is the live Juspay branch and the only branch that should drive the hosted Vercel production deployment
- `main` is the curated OSS-safe branch for self-hosted users and public releases

The expected promotion path is:

1. develop and test on `experimentation`
2. verify the behavior locally on `localhost`
3. merge or cherry-pick to `internal` when it is ready for the live Juspay instance
4. promote reusable, non-Juspay-specific changes from `internal` to `main`

`staging` is no longer part of the active workflow. It may still exist in git history, but contributors should not rely on it for day-to-day testing or release flow.

Vercel is treated as production-only for this repo. Required live secrets should stay scoped to the `Production` environment for the `internal` branch. Preview deployments for non-production branches are intentionally non-goals and do not need to stay green.

## Local setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your values (see README for setup guides)
4. Validate your config: `set -a && source .env.local && npm run validate:env`
5. Apply the preferred schema files in `supabase/migrations/`, or use `supabase-migration.sql` if you want the compatibility snapshot path
6. Start the dev server: `npm run dev`

At least one auth provider must be configured locally. Google is the default path; GitHub is optional.

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
- Do not put Juspay-only behavior on `main` unless it has been generalized for self-hosted users

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
