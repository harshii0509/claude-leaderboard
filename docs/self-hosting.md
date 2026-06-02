# Self-Hosting Guide

This guide is for teams who want to deploy their own copy of Claude Leaderboard without depending on the Juspay instance.

If you want to hand the repo to a coding agent and have it drive the setup with explicit human checkpoints, start with [docs/agent-setup.md](docs/agent-setup.md). This document remains the deeper operator reference.

The current production deployment can keep running exactly as-is. This repo is being hardened so other teams can self-host the same core product:

- the same raw-event sync pipeline
- the same streak and scoring logic
- the same reset, rebuild, and rescan controls

## What you are deploying

Claude Leaderboard is a self-hosted Next.js app backed by Supabase.

At a high level:

1. Users sign in with Google or GitHub.
2. Each user gets a one-line Setup command from `/setup`.
3. That installer writes a local `sync.py` script plus a personal sync credential.
4. Claude Code Stop hooks run the script after each session.
5. The server ingests raw usage events and computes leaderboard rollups.

## Recommended stack

The golden path for the first public version is:

- app hosting: Vercel
- database/auth/storage: Supabase
- user auth: Google OAuth by default, with optional GitHub OAuth support

That is the path the repo is optimized for today.

If you do not want to use Vercel, the repo now also includes a production `Dockerfile` built around Next.js standalone output.

## Prerequisites

- Node.js 18+
- a Supabase project
- at least one OAuth provider:
- a Google Cloud OAuth client, and/or
- a GitHub OAuth app
- a public app URL for your deployment

## Quick start

### Agent setup

For the fastest guided setup path, especially if you want Codex, Claude Code, or another shell-capable agent to do most of the work, use [docs/agent-setup.md](docs/agent-setup.md).

It is the decision-complete setup contract for:

- cloning and installing the repo
- collecting human-supplied secrets and hosted-service configuration
- validating `.env.local`
- applying the schema
- booting the app
- verifying first-user sync or demo data

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

Fill in all required values, then validate them:

```bash
set -a
source .env.local
npm run validate:env
```

### 3. Run the database schema

Prefer the ordered SQL files in `supabase/migrations/`.

Apply them in filename order:

- `202606010001_next_auth.sql`
- `202606010002_leaderboard_tables.sql`
- `202606010003_leaderboard_functions.sql`
- `202606010004_row_level_security.sql`

You can run them in the Supabase SQL editor one by one, or use your preferred migration workflow around that folder.

If you prefer the Supabase CLI, this repo includes a minimal workflow:

```bash
supabase link --project-ref <your-project-ref>
npm run db:push
```

That command uses `scripts/supabase-db-push.sh`, which simply runs `supabase db push --workdir supabase`.

`supabase-migration.sql` is still kept at the repo root as a compatibility snapshot if you want the older one-shot setup path.

This creates:

- NextAuth adapter tables
- the public leaderboard tables
- the private raw-event ledger
- RPCs for sync, reset, rebuild, and rescan

### 4. Start locally

```bash
npm run dev
```

Open `http://localhost:3000`.

If `npm run dev` stalls around native SWC startup on macOS, or you see code-signing / SWC load failures, confirm your shell is on Node `>=20.9.0` and fall back to:

```bash
npm run dev:compat
```

That uses webpack plus the vendored WASM SWC package, which is slower than the default Turbopack path but much more reliable on restricted local runtimes.

### 5. Deploy

The easiest deploy target is Vercel. Set the same environment variables in your hosting provider and update `NEXT_PUBLIC_APP_URL` to your public domain.

## Docker deployment

This repo ships a production container path for teams running on platforms like Render, Railway, Fly.io, DigitalOcean Apps, Kubernetes, or plain Docker hosts.

### Build the image

```bash
docker build -t claude-leaderboard .
```

### Run the container

```bash
docker run --rm -p 3000:3000 --env-file .env.local claude-leaderboard
```

The container uses:

- Next.js standalone output
- `HOSTNAME=0.0.0.0`
- `PORT=3000`
- `node server.js`

### Notes

- Keep `NEXT_PUBLIC_APP_URL` pointed at your public domain, not `localhost`, for real user installs.
- The app still depends on Supabase and Google OAuth, so containerizing the app does not remove those external dependencies.
- Local development is still better with `npm run dev`; Docker is primarily for production-style deployment.

## Required environment variables

| Variable | Why it exists |
| --- | --- |
| `SUPABASE_URL` | Connects the app to your Supabase project |
| `SUPABASE_ANON_KEY` | Public browser/client access to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access for auth, sync, and admin commands |
| `GOOGLE_CLIENT_ID` | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `GITHUB_CLIENT_ID` | GitHub sign-in |
| `GITHUB_CLIENT_SECRET` | GitHub sign-in |
| `AUTH_SECRET` | Session encryption for NextAuth |
| `NEXT_PUBLIC_APP_URL` | Generates install commands and callback URLs |
| `ALLOWED_EMAIL_DOMAIN` | Optional single-domain restriction |

## Google OAuth checklist

In Google Cloud:

1. Create an OAuth 2.0 Client ID for a web app.
2. Add your app URL to authorized JavaScript origins.
3. Add `https://your-domain.com/api/auth/callback/google` to redirect URIs.

## GitHub OAuth checklist

In GitHub Developer Settings:

1. Create an OAuth App.
2. Set the homepage URL to your app URL.
3. Add `https://your-domain.com/api/auth/callback/github` as the callback URL.

## First-time operator flow

After deploy:

1. Sign in as the first user.
2. Open `/setup`.
3. Run either the quick install command or the inspect-before-run command on your own machine.
4. Run `python3 ~/.claude/sync.py` once to confirm sync works.
5. Open the homepage and verify your leaderboard entry appears.

## Team rollout flow

For each teammate:

1. They sign in.
2. They open `/setup`.
3. They run the one-line install command.
4. Claude begins auto-syncing after each session.

The installer is TTY-aware and safe to rerun. It will:

- detect whether the machine is doing a fresh install, upgrade, or repair
- preflight `bash`, `curl`, `python3`, and a writable `~/.claude`
- refresh the Claude Stop hook idempotently
- run a local health check before it exits

## Ownership and member management

Every self-hosted instance has one owner at a time.

- the first successful signed-in user becomes the initial owner automatically
- the owner can transfer ownership and promote or demote admins
- admins can manage regular members and operational rollout tasks
- member management lives in `/admin/leaderboard`

There are two separate removal flows:

- `Deactivate`: hides the user from the active leaderboard and blocks future setup/sync activity, but keeps history for audit or later restoration
- `Hard delete`: permanently removes the account and synced leaderboard data

Recommended operator practice:

1. create at least two privileged accounts so the instance is never stranded on one person
2. use `Deactivate` first when you only want someone off the board
3. reserve `Hard delete` for real account/data removal
4. transfer ownership before removing the current owner from day-to-day operations

## Demo / evaluation mode

If you want to understand the product before rolling it out to a real team, use the demo seed in `supabase/seed/demo.sql`.

It creates synthetic users and synthetic raw usage events, then rebuilds the leaderboard through `refresh_all_leaderboard_rollups()`.

That gives you a populated environment for:

- leaderboard ranking
- streak display
- profile modal details
- activity heatmaps

Use it only for local or evaluation setups, not real production environments.

If you ever change scoring logic or need to replay history:

1. `npm run leaderboard:rescan`
2. Ask users to rerun Setup or `python3 ~/.claude/sync.py`
3. Monitor `/admin/leaderboard`
4. `npm run leaderboard:rebuild` once refill is done

## Operational commands

```bash
npm run leaderboard:status
```

Shows sync generation, refill progress, and pending users.

```bash
npm run leaderboard:rescan
```

Requests a full client replay on next sync.

```bash
npm run leaderboard:rebuild
```

Recomputes rollups from raw events.

```bash
npm run leaderboard:reset
```

Clears leaderboard data while preserving users.

## Current limitations

These are intentional constraints for the current open-source shape:

- Google is the default sign-in provider and GitHub is the supported optional second provider today.
- Supabase is the only supported backend today.
- The installer is optimized for macOS/Linux shell environments.
- Multi-tenant SaaS is out of scope for this repo right now.

## Recommended roadmap for wider adoption

If you want to keep pushing this as an OSS project, the next sensible steps are:

1. Add a Supabase CLI-driven migration workflow around `supabase/migrations/`.
2. Add focused tests around leaderboard math and sync ingestion.
3. Publish screenshots and a demo dataset for easier evaluation.
4. Consider invite-based access controls if teams want looser domain restrictions with GitHub sign-in.

## Design principle

The self-hosted distribution should stay close to the battle-tested production instance. The goal is not to fork the product into a separate codebase. The goal is to package the same core logic so other teams can run it safely on their own infrastructure.
