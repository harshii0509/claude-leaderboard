# Self-Hosting Guide

This guide is for teams who want to deploy their own copy of Claude Leaderboard without depending on the Juspay instance.

The current production deployment can keep running exactly as-is. This repo is being hardened so other teams can self-host the same core product:

- the same raw-event sync pipeline
- the same streak and scoring logic
- the same reset, rebuild, and rescan controls

## What you are deploying

Claude Leaderboard is a self-hosted Next.js app backed by Supabase.

At a high level:

1. Users sign in with Google.
2. Each user gets a one-line Setup command from `/setup`.
3. That installer writes a local `sync.py` script plus a personal sync credential.
4. Claude Code Stop hooks run the script after each session.
5. The server ingests raw usage events and computes leaderboard rollups.

## Recommended stack

The golden path for the first public version is:

- app hosting: Vercel
- database/auth/storage: Supabase
- user auth: Google OAuth

That is the path the repo is optimized for today.

## Prerequisites

- Node.js 18+
- a Supabase project
- a Google Cloud OAuth client
- a public app URL for your deployment

## Quick start

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

Open your Supabase SQL editor and run the contents of `supabase-migration.sql`.

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

### 5. Deploy

The easiest deploy target is Vercel. Set the same environment variables in your hosting provider and update `NEXT_PUBLIC_APP_URL` to your public domain.

## Required environment variables

| Variable | Why it exists |
| --- | --- |
| `SUPABASE_URL` | Connects the app to your Supabase project |
| `SUPABASE_ANON_KEY` | Public browser/client access to Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access for auth, sync, and admin commands |
| `GOOGLE_CLIENT_ID` | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `AUTH_SECRET` | Session encryption for NextAuth |
| `NEXT_PUBLIC_APP_URL` | Generates install commands and callback URLs |
| `ALLOWED_EMAIL_DOMAIN` | Optional single-domain restriction |

## Google OAuth checklist

In Google Cloud:

1. Create an OAuth 2.0 Client ID for a web app.
2. Add your app URL to authorized JavaScript origins.
3. Add `https://your-domain.com/api/auth/callback/google` to redirect URIs.

## First-time operator flow

After deploy:

1. Sign in as the first user.
2. Open `/setup`.
3. Run the generated install command on your own machine.
4. Run `python3 ~/.claude/sync.py` once to confirm sync works.
5. Open the homepage and verify your leaderboard entry appears.

## Team rollout flow

For each teammate:

1. They sign in.
2. They open `/setup`.
3. They run the one-line install command.
4. Claude begins auto-syncing after each session.

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

- Google is the only supported sign-in provider today.
- Supabase is the only supported backend today.
- The installer is optimized for macOS/Linux shell environments.
- Multi-tenant SaaS is out of scope for this repo right now.

## Recommended roadmap for wider adoption

If you want to keep pushing this as an OSS project, the next sensible steps are:

1. Split `supabase-migration.sql` into versioned migrations.
2. Add focused tests around leaderboard math and sync ingestion.
3. Add GitHub auth as an optional second provider.
4. Publish screenshots and a demo dataset for easier evaluation.

## Design principle

The self-hosted distribution should stay close to the battle-tested production instance. The goal is not to fork the product into a separate codebase. The goal is to package the same core logic so other teams can run it safely on their own infrastructure.
