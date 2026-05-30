# Contributing

Thanks for your interest in contributing to Claude Leaderboard!

## Local setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your values (see README for setup guides)
4. Run the Supabase migration in `supabase-migration.sql` against your project
5. Start the dev server: `npm run dev`

## Making changes

- Keep PRs small and focused on a single concern
- Run `npm run lint` before opening a PR
- If adding a new env var, add it to `.env.example` with a comment

## Reporting issues

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
