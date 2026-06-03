# Claude Leaderboard

A self-hosted leaderboard for tracking your team's [Claude Code](https://claude.ai/code) and Codex usage. Team members sign in, install a one-line sync hook, and their local AI coding activity is aggregated and displayed on a shared leaderboard.

<!-- Add a screenshot here once designs are finalized -->

This repo now serves two purposes:

- the battle-tested product currently running for your internal team
- a self-hosted open-source distribution other teams can deploy themselves

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

### Agent setup

If you want to hand this repo to a coding agent and let it drive the setup, start with [docs/agent-setup.md](docs/agent-setup.md).

That playbook is the agent-facing contract for this repo: it tells the agent exactly how to bootstrap the app, where to pause for human-owned secrets or OAuth console work, how to verify first-user sync, and how to switch to a demo/evaluation path when you do not want a full team rollout yet.

Starter prompt:

```text
Set up this repo by following docs/agent-setup.md exactly. Use the default self-hosted path: Vercel + Supabase + Google OAuth. Do everything you can yourself, pause only at the human checkpoints, and verify local boot plus first-user sync before you stop.
```

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

Validate the environment contract before you boot the app:

```bash
set -a
source .env.local
npm run validate:env
```

### 3. Run the database migration

For new self-hosted setups, apply the ordered SQL files in `supabase/migrations/`.

If you prefer the old one-shot flow, you can still run `supabase-migration.sql` as a compatibility snapshot.

If you use the Supabase CLI, the repo now includes a thin workflow for the migration folder:

```bash
supabase link --project-ref <your-project-ref>
npm run db:push
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If local dev feels stuck on macOS or in a managed runtime because Next.js cannot load the native SWC binary, first make sure you are on Node `>=20.9.0`, then use the compatibility path:

```bash
npm run dev:compat
```

That route forces webpack mode and points Next.js at the vendored WASM SWC package instead of relying on the native binding.

For a more detailed self-hosting walkthrough, see [docs/self-hosting.md](docs/self-hosting.md).

If you want the shortest guided path for a coding agent, use [docs/agent-setup.md](docs/agent-setup.md).

If you want to evaluate the app without onboarding a real team first, there is also a demo seed at `supabase/seed/demo.sql`.

## Deployment

The easiest way to deploy is Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/harshii0509/claude-leaderboard)

After deploying, add your environment variables in the Vercel dashboard under **Settings → Environment Variables**, then set `NEXT_PUBLIC_APP_URL` to your production URL.

If you want to self-host outside Vercel, this repo also supports a Docker-based deployment path using Next.js standalone output. See [docs/self-hosting.md](docs/self-hosting.md).

## Configuration

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `GOOGLE_CLIENT_ID` | Conditionally | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Conditionally | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | Conditionally | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Conditionally | GitHub OAuth client secret |
| `AUTH_SECRET` | Yes | Random secret for NextAuth session encryption (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of your deployment (no trailing slash) |
| `ALLOWED_EMAIL_DOMAIN` | No | If set, only emails ending with this domain can sign in (e.g. `yourcompany.com`) |

At least one auth provider must be configured. Google remains the default path used by the current live deployment, and GitHub is available as an optional second provider for self-hosted teams.

### Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add your domain to **Authorized JavaScript origins**
4. Add `https://yourdomain.com/api/auth/callback/google` to **Authorized redirect URIs**

### GitHub OAuth setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set the homepage URL to your app URL
4. Set the callback URL to `https://yourdomain.com/api/auth/callback/github`

## How it works

1. Users sign in with Google and visit the **Setup** page
2. They run a one-line curl command or an inspect-before-run variant from the Setup page
3. The installer preflights the local shell, downloads `sync.py`, installs the Claude Stop hook plus a background scheduler, then exchanges a short-lived install token for that user's long-lived sync credential and stores it locally in `~/.claude/sync_config.json`
4. After every Claude Code session, the hook runs `sync.py`, while the background scheduler keeps Codex-only activity moving by periodically rerunning that same script. `sync.py` incrementally parses new finalized usage events from `~/.claude/projects/` and Codex turn telemetry from `~/.codex/logs_2.sqlite`, then POSTs raw events to your deployment
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

There is also an authenticated in-app status page at `/admin/leaderboard`, including copyable resync messaging and a live pending-user list for operator follow-up.

## Ownership and admin controls

Each self-hosted instance now has explicit governance:

- the first successful signed-in user becomes the initial `owner`
- the owner can promote or demote admins and transfer ownership
- admins can manage regular members
- deactivated members are hidden from the live leaderboard and blocked from new sync/setup activity
- hard delete permanently removes a user account and synced leaderboard history

For safety, privileged users cannot self-delete from the profile page. Transfer or remove them from `/admin/leaderboard` instead.

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
- upgrades or repairs existing local installs automatically
- switches them to the new raw-event sync contract
- adds Codex usage collection if `~/.codex/logs_2.sqlite` is present
- re-registers the automatic Claude `Stop` hook if needed
- installs or refreshes the background scheduler that keeps Codex-only activity syncing

After that one-time reinstall, syncing continues automatically after each Claude session and during background Codex-only periods.

For local verification and troubleshooting, the installed sync script now also supports:

- `python3 ~/.claude/sync.py --doctor`
- `python3 ~/.claude/sync.py --dry-run`

## Case study

See [docs/leaderboard-case-study.md](docs/leaderboard-case-study.md) for a detailed before/after breakdown of the architecture, streak fixes, reset strategy, and rollout decisions.

For the one-time rollout message after a global rescan, see [docs/team-resync-message.md](docs/team-resync-message.md).

For self-serve deployment guidance aimed at outside teams, see [docs/self-hosting.md](docs/self-hosting.md).

If you want to delegate that setup to an agent, use [docs/agent-setup.md](docs/agent-setup.md).

## Rollout playbook

When you need to fix scoring logic, rebuild history, or start a clean season without deleting users:

1. Run `npm run leaderboard:reset` if you want to clear leaderboard data and replay from scratch, or `npm run leaderboard:rescan` if you only need clients to resend history into the existing raw-event ledger.
2. Ask the team to rerun the Setup command or `python3 ~/.claude/sync.py` once.
3. Monitor progress with `npm run leaderboard:status` or `/admin/leaderboard`.
4. Once everyone has resynced, run `npm run leaderboard:rebuild` if you want one final rollup refresh from the raw ledger.

## Quality checks

Before opening a PR or cutting a release, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker deployment

This repo includes a production `Dockerfile` for teams that want to self-host on any platform that can run containers.

Build the image:

```bash
docker build -t claude-leaderboard .
```

Run it with your environment variables:

```bash
docker run --rm -p 3000:3000 --env-file .env.local claude-leaderboard
```

For the full container-oriented flow and operator notes, see [docs/self-hosting.md](docs/self-hosting.md).

## Demo dataset

For evaluation environments, the repo includes a synthetic demo seed at `supabase/seed/demo.sql`.

It inserts sample users plus raw usage events, then rebuilds the leaderboard through the same rollup path the real product uses. This gives self-hosters a quick way to explore:

- the homepage leaderboard
- profile modals
- activity heatmaps
- streak behavior

Use it for local or staging-style demos, not for a real production deployment.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support and security

- Support guidance: [SUPPORT.md](SUPPORT.md)
- Security reporting: [SECURITY.md](SECURITY.md)

## License

MIT — see [LICENSE](LICENSE).
