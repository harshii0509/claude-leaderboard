# Claude Leaderboard

A self-hosted leaderboard for tracking your team's [Claude Code](https://claude.ai/code) usage. Team members sign in, install a one-line sync hook, and their Claude Code activity is automatically aggregated and displayed on a shared leaderboard.

<!-- Add a screenshot here once designs are finalized -->

## Features

- **Team leaderboard** — rank members by tokens, messages, or streak
- **Podium view** — spotlight your top 3 contributors
- **Activity heatmap** — 90-day GitHub-style heatmap per user
- **Model breakdown** — see which Claude models each person uses
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
3. After every Claude Code session, the hook runs `sync.py`, which parses local JSONL usage logs from `~/.claude/projects/` and POSTs aggregated stats to your deployment
4. The leaderboard updates automatically

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
