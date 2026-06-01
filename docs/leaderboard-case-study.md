# Leaderboard Reliability Rewrite

## Summary

This project started as a fast prototype for ranking Claude Code usage across a team. It worked, but it relied on client-computed totals, stale streak snapshots, and ad hoc operational recovery. The rewrite moved the system to a server-verified event pipeline, added safer admin controls, and made the leaderboard explainable enough to showcase in a portfolio.

## The problem

The original architecture had three core weaknesses:

1. The client calculated final totals and posted them directly.
2. `current_streak` was stored at sync time, so it could stay non-zero long after someone stopped using the product.
3. There was no safe way to rebuild or reset the leaderboard for everyone without manual database work and local cache cleanup.

That combination made the app hard to trust and hard to operate.

## Before

### Data flow

1. A Python hook parsed local logs.
2. The hook aggregated totals on the user machine.
3. The backend accepted those totals and wrote them into leaderboard tables.

### Failure modes

- A client could over-report totals.
- Debugging bad rankings was difficult because only the final aggregates were stored.
- Recomputing logic after a bug fix was expensive because the system did not keep a clean raw event ledger.
- Current streaks drifted out of reality because they were treated like stored state instead of a live function of recent activity.

### Operational pain

- “Reset the leaderboard” was not a real product capability.
- “Rebuild from source data” was not a clean admin action.
- Clients had no server-controlled signal telling them to resend history after a migration.

## After

### Architecture

The system now follows a more reliable separation of concerns:

1. The local Python collector extracts raw usage facts from Claude and Codex.
2. The server validates and stores those facts idempotently.
3. Derived leaderboard tables are rebuilt from raw events.
4. Current streak is calculated live from daily activity, while longest streak remains a historical rollup.

### Data model changes

- Added a raw event ledger in `leaderboard_private.raw_usage_events`
- Added `leaderboard_private.system_state` to track sync generation
- Added `last_activity_date` to `public.user_stats`
- Added server RPCs for rebuild, reset, and safe global rescan

### Product behavior changes

- Current streak now decays correctly even if a user stops syncing.
- Global rescans can be requested without destructive data loss.
- A full reset preserves users while allowing a clean replay from client history.
- Claude and Codex usage flow through the same canonical scoring pipeline.

## Key engineering decisions

### 1. Raw events over client aggregates

The biggest architectural change was moving from “client posts totals” to “client posts facts.” That lets the server own the leaderboard math and makes scoring changes replayable.

### 2. Live current streak

`current_streak` is time-sensitive by definition. Storing it in a table caused drift. The rewrite keeps daily activity as the durable record and computes current streak from that activity at read time.

### 3. Separate rebuild from reset

Rebuild and reset sound similar but serve different jobs:

- `rebuild` recomputes derived tables from existing raw events
- `rescan` tells clients to replay local history without deleting server data
- `reset` clears leaderboard data intentionally while preserving users

Treating those as separate controls makes operations much safer.

### 4. Sync generation

Client caches are useful for incremental sync, but they become a liability after a migration or data correction. A server-owned sync generation solves that cleanly: once the generation bumps, every client knows to rescan local history on the next sync.

### 5. Rollout visibility

Operational migrations fail when you cannot tell who has actually moved over. The rewrite adds a sync-status control so the team can see which users have repopulated raw events and which users still need one more sync after a global rescan.

## Migration playbook

This project also needed an operational answer to a product question: "How do we reset everyone, keep the users, and refill trustworthy data?"

The final playbook is:

1. `reset` if you want a clean season or want to intentionally wipe leaderboard-derived data while preserving users.
2. `rescan` if you need all installed clients to replay local history into the new pipeline.
3. Track refill progress with the CLI status command or `/admin/leaderboard`.
4. `rebuild` once the raw ledger is fully repopulated and you want a final deterministic rollup pass.

That turns what used to be a manual recovery task into an explicit, repeatable operator workflow.

## Rollout notes

This rewrite surfaced a real migration gap: only a subset of users had already moved onto the raw-event pipeline. That meant rebuilding from raw events alone could not preserve every historical score immediately. The solution was to add the sync-generation rescan path so installed clients can refill the ledger safely over time.

## Outcome

The leaderboard is now closer to a trustworthy product system than a demo:

- server-side source of truth
- auditable raw events
- deterministic rollups
- live streak correctness
- explicit rebuild and reset controls
- safer migration path for future scoring changes

## Showcase framing

If you want to describe this in a portfolio, the strongest one-line summary is:

> Re-architected a team AI-usage leaderboard from client-reported snapshots into a server-verified event pipeline with live streak calculation, replayable rollups, and production-safe reset/rebuild controls.
