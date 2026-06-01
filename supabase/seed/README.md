# Demo Seed

This folder contains optional evaluation data for self-hosted environments.

## `demo.sql`

`demo.sql` inserts a synthetic team into:

- `next_auth.users`
- `leaderboard_private.raw_usage_events`

Then it calls the existing rollup path:

- `public.refresh_all_leaderboard_rollups()`

That means the seeded leaderboard is built through the same derived-table logic used by the real product.

## When to use it

Use this when:

- you want to evaluate the UI quickly
- you are demoing the project without a real team rollout
- you want the leaderboard, profile modal, and activity heatmap to feel populated immediately

## When not to use it

Do not use this in a real production environment with real users.

It is intended for local or evaluation deployments only.
