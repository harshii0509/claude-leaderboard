# Claude Usage Leaderboard — Web App with Login + Auto-Sync

## Context
The design team uses Claude Code daily for prototypes and side projects. Goal: a fun web leaderboard showing who uses Claude the most, with proper login and **fully automatic sync** — no manual scripts, data updates itself every time someone uses Claude Code.

## Key Design Decisions
- **Login via Google OAuth** — designers almost certainly have Google accounts
- **Auto-sync via Claude Code `Stop` hook** — fires every time Claude finishes responding; runs a background sync script silently. Setup is one-time only.
- **Hosted web app** — deploy to Vercel (free), database on Supabase (free PostgreSQL)

## How It Works

```
First-time setup (once per team member):
  1. Visit leaderboard web app
  2. Sign in with Google
  3. Copy one-line install command from the app
  4. Paste it in terminal → installs hook + saves auth token locally

Every time Claude Code is used (automatic):
  ~/.claude/projects/**/*.jsonl
         │  (Stop hook fires in background)
         ▼
  sync.py  ──→  POST /api/sync  ──→  Supabase DB  ──→  Leaderboard UI
  (reads local JSONL,              (JWT auth)
   aggregates tokens,
   submits silently)
```

The Stop hook is configured as `async: true` — it never blocks or slows Claude down.

## Tech Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | Next.js (App Router) | One repo, API routes + UI |
| Auth | NextAuth.js + Google provider | Simple OAuth, free |
| Database | Supabase (free PostgreSQL) | Hosted, free tier, real-time |
| Sync script | `sync.py` (Python stdlib only) | No pip install, runs on any Mac |
| Hosting | Vercel | Zero-config Next.js deployment |

## Metrics Tracked
- Total tokens (input + output + cache read/write)
- Total messages sent
- Total sessions & project count (not names)
- Current streak / longest streak (consecutive active days)
- Model usage breakdown (Sonnet vs Opus vs Haiku)
- Daily activity (last 90 days — for heatmap)

---

## Implementation Phases

### Phase 1 — Supabase Schema + NextAuth Setup (2 hrs)

**Supabase tables:**
```sql
-- users table (managed by NextAuth adapter)
-- activities table for synced data:
CREATE TABLE user_stats (
  user_id        TEXT PRIMARY KEY REFERENCES users(id),
  total_input_tokens   BIGINT DEFAULT 0,
  total_output_tokens  BIGINT DEFAULT 0,
  total_cache_tokens   BIGINT DEFAULT 0,
  total_messages       INT DEFAULT 0,
  total_sessions       INT DEFAULT 0,
  total_projects       INT DEFAULT 0,
  current_streak       INT DEFAULT 0,
  longest_streak       INT DEFAULT 0,
  models_used          JSONB DEFAULT '{}',
  last_synced          TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_activity (
  user_id    TEXT REFERENCES users(id),
  date       DATE,
  messages   INT DEFAULT 0,
  input_tokens BIGINT DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

**NextAuth config** (`app/api/auth/[...nextauth]/route.ts`):
- Google provider
- Supabase adapter
- JWT strategy with custom `sync_token` claim (used by sync script to authenticate)

### Phase 2 — Sync API Endpoint (1-2 hrs)

`POST /api/sync` — authenticated by Bearer token (JWT stored locally after first login)

Accepts the aggregated payload:
```json
{
  "stats": {
    "totalInputTokens": 841203,
    "totalOutputTokens": 293847,
    "totalCacheTokens": 601139,
    "totalMessages": 1847,
    "totalSessions": 203,
    "totalProjects": 12,
    "currentStreak": 7,
    "longestStreak": 23,
    "modelsUsed": { "claude-sonnet-4-6": 1203, "claude-opus-4-6": 644 },
    "dailyActivity": { "2026-03-22": { "messages": 47, "inputTokens": 12043 } }
  }
}
```

Upserts into `user_stats` and `daily_activity` tables.

### Phase 3 — `sync.py` Collection Script (2 hrs)

Single Python file, zero external dependencies. Lives at `~/.claude-leaderboard/sync.py`.

**What it does:**
1. Reads auth token from `~/.claude-leaderboard/config.json`
2. Walks `~/.claude/projects/**/*.jsonl`, parses token fields
3. Deduplicates by session ID (to avoid double-counting across runs)
4. Computes streaks from sorted active dates
5. POSTs aggregated stats to the leaderboard API
6. Runs silently — no output unless there's an error
7. Caches last-synced session IDs to `~/.claude-leaderboard/synced_sessions.json` (incremental sync)

**Config file** (`~/.claude-leaderboard/config.json`):
```json
{
  "sync_token": "...",
  "api_url": "https://your-leaderboard.vercel.app",
  "last_sync": "2026-03-23T14:00:00Z"
}
```

### Phase 4 — One-Time Install Command (1 hr)

The web app generates a personalized install command on the user's profile/settings page:

```bash
curl -s https://your-leaderboard.vercel.app/api/install/<token> | python3
```

This script:
1. Downloads `sync.py` to `~/.claude-leaderboard/sync.py`
2. Writes `~/.claude-leaderboard/config.json` with the user's sync token
3. Adds the Stop hook to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude-leaderboard/sync.py",
            "async": true
          }
        ]
      }
    ]
  }
}
```

After this one command, every Claude session automatically syncs in the background.

### Phase 5 — Leaderboard Frontend (4-5 hrs)

**Pages:**
- `/` — leaderboard (public, anyone with the link can view)
- `/profile` — personal stats page (requires login)
- `/setup` — shows personalized install command after login

**Components:**
```
app/
  components/
    Podium.tsx          # top 3 with gold/silver/bronze
    RankingsTable.tsx   # full sortable table
    DetailPanel.tsx     # expanded row with heatmap + model donut
    ActivityHeatmap.tsx # GitHub-style 90-day activity grid
    StatCard.tsx        # metric card
    SortBar.tsx         # period (7d/30d/all) + sort toggles
  hooks/
    useLeaderboard.ts   # SWR data fetching with sort/filter
```

**Visual style:** dark background (`#0f0f13`), gold/silver/bronze accents, podium layout for top 3, fire emoji pulsing for 7+ day streaks, activity heatmap in expanded row.

### Phase 6 — Deploy + Team Rollout (1 hr)

1. Push to GitHub → Vercel auto-deploys on every push
2. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` to Vercel env vars
3. Share the leaderboard URL + setup instructions with team in Slack
4. Each person: visit URL → sign in with Google → copy install command → paste in terminal → done

---

## Project Structure
```
claude-leaderboard/
  app/
    page.tsx                    # leaderboard homepage
    profile/page.tsx            # personal stats
    setup/page.tsx              # shows install command
    api/
      auth/[...nextauth]/       # NextAuth
      sync/route.ts             # receives sync data
      leaderboard/route.ts      # serves leaderboard data
      install/[token]/route.ts  # generates install script
  components/
    Podium.tsx
    RankingsTable.tsx
    DetailPanel.tsx
    ActivityHeatmap.tsx
    StatCard.tsx
    SortBar.tsx
  lib/
    db.ts                       # Supabase client
    auth.ts                     # NextAuth config
    sync.ts                     # upsert logic
  public/
    sync.py                     # also served statically as fallback
  install.py                    # bootstraps sync.py + hook (generated per-user)
```

## Privacy
- Project names and file paths never leave the machine — only counts and token numbers
- Users control their data: delete account from `/profile` removes all records
- `async: true` on the hook means sync never blocks or slows Claude
- Sync script runs only when Claude Code is actively used (not a background daemon)

## Verification
1. Add Stop hook manually and run Claude → check Supabase dashboard for new `daily_activity` row
2. Sign in with Google → verify user created in Supabase `users` table
3. Paste install command → verify `~/.claude-leaderboard/config.json` created and hook added to `~/.claude/settings.json`
4. Run `python3 ~/.claude-leaderboard/sync.py` manually → verify leaderboard updates
5. Check leaderboard with 2+ users signed up → verify sort/filter controls work
