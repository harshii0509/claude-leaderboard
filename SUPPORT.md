# Support

## What this project is

Claude Leaderboard is a self-hosted app. The repository is maintained to help teams run their own deployment, not as a hosted SaaS support desk.

## Where to ask for help

- Use GitHub issues for reproducible bugs and concrete feature requests.
- Use the docs in `README.md`, `docs/self-hosting.md`, and `supabase/README.md` first for setup and migration questions.

## What makes a good bug report

Please include:

- what you were trying to do
- exact steps to reproduce
- expected behavior
- actual behavior
- deployment style: Vercel, Docker, or local Node
- auth provider: Google, GitHub, or both
- any relevant logs or screenshots

## What maintainers may not be able to support deeply

- custom infra beyond the documented self-hosted paths
- private Supabase misconfiguration without repro details
- modified local sync scripts that diverge from this repo
- company-specific rollout policies outside the repo

## Before opening an issue

Please try:

1. `npm run validate:env`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

That usually narrows problems down quickly.
