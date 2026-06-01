-- ============================================================
-- Row Level Security
-- ============================================================

alter table next_auth.users enable row level security;
alter table next_auth.accounts enable row level security;
alter table next_auth.sessions enable row level security;
alter table next_auth.verification_tokens enable row level security;
alter table public.user_stats enable row level security;
alter table public.daily_activity enable row level security;
alter table leaderboard_private.sync_credentials enable row level security;
alter table leaderboard_private.install_tokens enable row level security;
alter table leaderboard_private.raw_usage_events enable row level security;

drop policy if exists "public read users" on next_auth.users;
drop policy if exists "public read user_stats" on public.user_stats;
drop policy if exists "public read daily_activity" on public.daily_activity;

drop policy if exists "deny all next_auth users" on next_auth.users;
drop policy if exists "deny all next_auth accounts" on next_auth.accounts;
drop policy if exists "deny all next_auth sessions" on next_auth.sessions;
drop policy if exists "deny all next_auth verification tokens" on next_auth.verification_tokens;
drop policy if exists "deny all user stats" on public.user_stats;
drop policy if exists "deny all daily activity" on public.daily_activity;
drop policy if exists "deny all sync credentials" on leaderboard_private.sync_credentials;
drop policy if exists "deny all install tokens" on leaderboard_private.install_tokens;
drop policy if exists "deny all raw usage events" on leaderboard_private.raw_usage_events;

create policy "deny all next_auth users"
on next_auth.users
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all next_auth accounts"
on next_auth.accounts
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all next_auth sessions"
on next_auth.sessions
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all next_auth verification tokens"
on next_auth.verification_tokens
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all user stats"
on public.user_stats
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all daily activity"
on public.daily_activity
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all sync credentials"
on leaderboard_private.sync_credentials
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all install tokens"
on leaderboard_private.install_tokens
for all
to authenticated, anon
using (false)
with check (false);

create policy "deny all raw usage events"
on leaderboard_private.raw_usage_events
for all
to authenticated, anon
using (false)
with check (false);

-- Service role bypasses RLS automatically. We intentionally do not expose
-- leaderboard tables directly through public policies; all reads/writes go
-- through server-side code.
