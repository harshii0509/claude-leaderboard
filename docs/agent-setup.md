# Agent Setup Playbook

This playbook is the fastest way to hand Claude Leaderboard to a coding agent and get back a working self-hosted deployment.

It is written for any shell-capable agent such as Codex, Claude Code, or similar tools. The goal is not to make the agent guess how this repo works. The goal is to give it one explicit contract to follow.

## Goal

Have the agent complete this flow:

1. clone and install the repo
2. validate environment variables
3. apply the Supabase schema
4. boot the app locally
5. verify first-user sign-in and sync

This playbook is documentation-only. It does not change the current production behavior or the live Juspay setup flow.

## Preferred setup path

Use this path unless the human explicitly asks for something else:

- app hosting: Vercel
- backend/auth/database: Supabase
- auth: Google OAuth by default
- optional auth: GitHub OAuth

This is the path the repo is optimized for today.

## How to use this playbook

Tell the agent to follow this file exactly, pause at every human checkpoint, and keep going after each checkpoint is complete.

Suggested starter prompt:

```text
Set up this repo by following docs/agent-setup.md exactly. Use the default self-hosted path: Vercel + Supabase + Google OAuth. Do everything you can yourself, pause only at the human checkpoints, and verify local boot plus first-user sync before you stop.
```

## Phase 1: Clone and install

Run:

```bash
git clone https://github.com/harshii0509/claude-leaderboard.git
cd claude-leaderboard
npm install
```

Expected result:

- dependencies install successfully
- the repo contains `.env.example`, `supabase/migrations/`, and `public/sync.py`

If blocked:

- if `npm install` fails, report the exact error and stop
- if the repo is missing expected files, stop and report that the checkout is incomplete

## Phase 2: Human checkpoint for infrastructure

The agent should pause here and ask the human for the following values or completed setup work:

1. a Supabase project
2. a public app URL
3. a Google OAuth client
4. optional GitHub OAuth app

The human should finish these steps before the agent continues.

### Required values the human must provide

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Optional:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `ALLOWED_EMAIL_DOMAIN`

### Human console checklist

Supabase:

- create a project
- copy the project URL
- copy the anon key
- copy the service role key

Google OAuth:

- create a web OAuth client
- add the app URL to authorized JavaScript origins
- add `https://your-domain.com/api/auth/callback/google` to redirect URIs

GitHub OAuth, if used:

- create an OAuth App
- set the homepage URL to the app URL
- set the callback URL to `https://your-domain.com/api/auth/callback/github`

If the human has not done this work yet, the agent should wait instead of improvising.

## Phase 3: Configure environment variables

Run:

```bash
cp .env.example .env.local
```

The agent should then help the human populate `.env.local` with the values above.

After the file is filled in, run:

```bash
set -a
source .env.local
npm run validate:env
```

Expected result:

- the command prints `Environment variables look ready for a self-hosted deployment.`

If blocked:

- if `validate:env` fails, do not continue
- fix the missing or malformed variables first

## Phase 4: Apply the schema

Preferred path:

```bash
supabase link --project-ref <your-project-ref>
npm run db:push
```

Alternative path if the human wants manual setup:

- apply the files in `supabase/migrations/` in filename order

Expected result:

- schema push succeeds without SQL errors
- the database now has NextAuth tables, leaderboard tables, raw-event tables, and RPC functions

If blocked:

- if `supabase` CLI is missing, install it or fall back to manual migration application
- if any migration fails, stop and report the exact failing file and error

## Phase 5: Boot the app locally

Run:

```bash
npm run dev
```

Expected result:

- the app boots locally
- `http://localhost:3000` loads

If blocked:

- if the app fails to boot, report the first real server error rather than guessing
- if auth redirect URLs are wrong, fix the OAuth console configuration before continuing

## Phase 6: Verify first-user sign-in and sync

The human should sign in with a real account using the configured provider.

Then the agent should guide the human through:

1. open `/setup`
2. choose either the quick install command or the inspect-before-run command
3. run that command on the human's machine
4. run `python3 ~/.claude/sync.py` once
5. reload the homepage and confirm the user appears on the leaderboard

Expected result:

- `~/.claude/sync.py` exists
- `~/.claude/sync_config.json` exists
- `python3 ~/.claude/sync.py --doctor` succeeds
- the sync command completes without auth or payload errors
- the homepage shows the signed-in user with usage data once local activity exists

If blocked:

- if `/setup` does not show an install command, re-check auth and `NEXT_PUBLIC_APP_URL`
- if the install script fails, capture the shell output and stop
- if sync fails, inspect the API response before making assumptions
- if the user signs in successfully but sees no leaderboard entry, verify that local Claude or Codex activity actually exists to upload

## Demo / evaluation branch

Use this branch when the human wants to evaluate the product without rolling it out to a real team yet.

After the schema is applied, seed the demo data:

- apply `supabase/seed/demo.sql`

Then:

1. boot the app
2. sign in
3. confirm the homepage is populated
4. inspect leaderboard ordering, profile modals, streaks, and heatmaps

Use this only for local, demo, or staging-style environments. Do not use it for a real production deployment.

## Quality checks

Before the agent reports setup complete, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected result:

- all commands pass

If `npm run build` or `npm run typecheck` fails in a sandboxed environment because remote fonts cannot be fetched, rerun the real build in an environment with normal network access before treating it as a product issue.

## Completion checklist

The setup is complete only when all of these are true:

- environment validation passes
- schema application passes
- local boot passes
- first-user sign-in works
- the setup page generates an install command
- a manual `python3 ~/.claude/sync.py` run succeeds
- the leaderboard or demo dataset is visible in the UI
- repo quality checks pass

## Boundaries

This playbook intentionally does not cover:

- multi-tenant SaaS behavior
- non-Supabase backends
- Windows-specific installer support
- changing the current internal Juspay deployment contract

Keep this repo close to the battle-tested production shape. The point is to package the same product for self-hosters, not to fork it.
