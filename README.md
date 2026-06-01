# Claude Leaderboard

A self-hosted leaderboard for tracking your team's [Claude Code](https://claude.ai/code) and Codex usage. Team members sign in, install a one-line sync hook, and their local AI coding activity is aggregated and displayed on a shared leaderboard.

<!-- Add a screenshot here once designs are finalized -->

## Features

- **Team leaderboard** — rank members by tokens, messages, or streak
- **Podium view** — spotlight your top 3 contributors
- **Activity heatmap** — 90-day GitHub-style heatmap per user
- **Model breakdown** — see which Claude and Codex models each person uses
- **Streak tracking** — current and longest usage streaks
- **Auto-sync** — a Claude Code hook pushes stats automatically after every session
- **Domain restriction** — optionally lock sign-in to your company email domain
- **One-click onboarding** — users get a curl install command from the Setup page

## Quick start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 client

### 1. Clone and install

```bash
git clone https://github.com/harshii0509/claude-leaderboard.git
cd claude-leaderboard
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values — see [Configuration](#configuration) below.

### 3. Run the database migration

In your Supabase project, open the SQL editor and run the contents of `supabase-migration.sql`. This creates all required tables and RLS policies.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The easiest way to deploy is Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/harshii0509/claude-leaderboard)

After deploying, add your environment variables in the Vercel dashboard under **Settings → Environment Variables**, then set `NEXT_PUBLIC_APP_URL` to your production URL.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `AUTH_SECRET` | Yes | Random secret for NextAuth session encryption (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of your deployment (no trailing slash) |
| `ALLOWED_EMAIL_DOMAIN` | No | If set, only emails ending with this domain can sign in (e.g. `yourcompany.com`) |

### Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add your domain to **Authorized JavaScript origins**
4. Add `https://yourdomain.com/api/auth/callback/google` to **Authorized redirect URIs**

## How it works

1. Users sign in with Google and visit the **Setup** page
2. They run a one-line curl command that installs a Python sync script and registers a Claude Code `Stop` hook on their machine
3. The installer exchanges a short-lived install token for that user's long-lived sync credential and stores it locally in `~/.claude/sync_config.json`
4. After every Claude Code session, the hook runs `sync.py`, which incrementally parses new finalized usage events from `~/.claude/projects/` and Codex turn telemetry from `~/.codex/logs_2.sqlite`, then POSTs raw events to your deployment
5. The server validates those events, stores them idempotently, and computes the official leaderboard totals, streaks, sessions, and model breakdowns
6. The leaderboard updates automatically

## Scoring model

The leaderboard score is based on total Claude and Codex usage tokens:

- `input_tokens`
- `output_tokens`
- `cache_creation_input_tokens`
- `cache_read_input_tokens`

Messages are counted from finalized Claude assistant usage events and Codex turns with token telemetry. Sessions are counted from distinct Claude session IDs and Codex thread IDs. Longest streak is rolled up from historical daily activity, while current streak is computed live from `daily_activity` so it decays correctly even when a user has stopped syncing.

## Operator commands

These commands require `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, plus `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run leaderboard:status
```

Shows a human-readable rollout summary: current sync generation, refill progress, and the exact users who still have not repopulated raw-event history after a migration or global rescan.

Use `node scripts/leaderboard-admin.mjs status --json` if you want the raw JSON payload instead.

There is also an authenticated in-app status page at `/admin/leaderboard`.

```bash
npm run leaderboard:rebuild
```

Rebuilds derived leaderboard tables from the raw event ledger without deleting users.

```bash
npm run leaderboard:rescan
```

Bumps the server sync generation so every installed client rescans its full local history on the next sync. Use this after a scoring migration or partial backfill issue.

```bash
npm run leaderboard:reset
```

Destructively clears stored leaderboard data, preserves users, and bumps sync generation so clients can repopulate from scratch. Use this only when you intentionally want a fresh season or a full replay.

## Upgrade existing installs

If your team already installed an older version of the sync hook, they should rerun the **Setup** command once.

That refresh does three things:

- installs the new incremental `sync.py`
- switches them to the new raw-event sync contract
- adds Codex usage collection if `~/.codex/logs_2.sqlite` is present
- re-registers the automatic Claude `Stop` hook if needed

After that one-time reinstall, syncing continues automatically after each Claude session.

## Case study

See [docs/leaderboard-case-study.md](docs/leaderboard-case-study.md) for a detailed before/after breakdown of the architecture, streak fixes, reset strategy, and rollout decisions.

For the one-time rollout message after a global rescan, see [docs/team-resync-message.md](docs/team-resync-message.md).

## Rollout playbook

When you need to fix scoring logic, rebuild history, or start a clean season without deleting users:

1. Run `npm run leaderboard:reset` if you want to clear leaderboard data and replay from scratch, or `npm run leaderboard:rescan` if you only need clients to resend history into the existing raw-event ledger.
2. Ask the team to rerun the Setup command or `python3 ~/.claude/sync.py` once.
3. Monitor progress with `npm run leaderboard:status` or `/admin/leaderboard`.
4. Once everyone has resynced, run `npm run leaderboard:rebuild` if you want one final rollup refresh from the raw ledger.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
