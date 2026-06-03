# Experiments

This document tracks product and platform work that is active, paused, or queued before it is ready for `staging` or `main`.

## Status board

| Track | Status | Branch | Issue | Notes |
| --- | --- | --- | --- | --- |
| Insights route and instance analytics | Paused | `experimentation` | `TBD` | Dedicated analytics surface exists, but product wording and follow-through still need review. |
| Weekly seasons and motivation loop | Paused | `experimentation` | `TBD` | Weekly-first leaderboard exists, but scoring, UX framing, and rollout still need another pass. |

## How to use this file

- Put shipped facts in `CHANGELOG.md`.
- Put paused, active, or planned explorations here.
- Link each experiment to a GitHub issue before reviving it.

## Current paused tracks

### Insights route and instance analytics

Why this started:
The app needed a clearer way to inspect aggregate usage without implying a richer team hierarchy than the current product model actually supports.

What exists on `experimentation`:
- Dedicated `/insights` page and route-aware navigation
- Instance-wide analytics query path and API surface
- Supporting tests for the route split and query contract

What still needs thought:
- Final product framing for who this view is for
- Whether the current cards and wording match the real data model
- How deeply this should go before it becomes operator analytics rather than lightweight insight

### Weekly seasons and motivation loop

Why this started:
The leaderboard needed a healthier motivation model than raw token volume, with more room for consistency, movement, and weekly momentum.

What exists on `experimentation`:
- Weekly-first leaderboard view and weekly season panel
- Composite weekly score and Monday-based season window
- Highlights, team quests, and weekly movement signals

What still needs thought:
- Final score tuning before this becomes the default experience
- How much of the game layer belongs in v1 versus later
- What rollout story makes sense if all-time remains the product's legacy anchor
