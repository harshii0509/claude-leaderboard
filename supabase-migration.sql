-- ============================================================
-- Schema for NextAuth adapter tables
-- ============================================================

create schema if not exists next_auth;

grant usage on schema next_auth to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on sequences to postgres, anon, authenticated, service_role;

create table if not exists next_auth.users (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  email        text unique,
  "emailVerified" timestamptz,
  image        text
);

create table if not exists next_auth.accounts (
  id                   uuid primary key default gen_random_uuid(),
  "userId"             uuid not null references next_auth.users(id) on delete cascade,
  type                 text not null,
  provider             text not null,
  "providerAccountId"  text not null,
  refresh_token        text,
  access_token         text,
  expires_at           bigint,
  token_type           text,
  scope                text,
  id_token             text,
  session_state        text,
  unique(provider, "providerAccountId")
);

create table if not exists next_auth.sessions (
  id             uuid primary key default gen_random_uuid(),
  "sessionToken" text unique not null,
  "userId"       uuid not null references next_auth.users(id) on delete cascade,
  expires        timestamptz not null
);

create table if not exists next_auth.verification_tokens (
  identifier text not null,
  token      text not null,
  expires    timestamptz not null,
  primary key (identifier, token)
);

-- ============================================================
-- Custom tables (public schema)
-- ============================================================

create table if not exists public.user_stats (
  user_id                          uuid primary key references next_auth.users(id) on delete cascade,
  sync_token                       uuid unique not null default gen_random_uuid(),
  total_input_tokens               bigint not null default 0,
  total_output_tokens              bigint not null default 0,
  total_cache_creation_input_tokens bigint not null default 0,
  total_cache_read_input_tokens    bigint not null default 0,
  total_messages                   bigint not null default 0,
  total_sessions                   int    not null default 0,
  current_streak                   int    not null default 0,
  longest_streak                   int    not null default 0,
  models_used                      jsonb  not null default '{}',
  last_synced_at                   timestamptz
);

create table if not exists public.daily_activity (
  id                             bigserial primary key,
  user_id                        uuid not null references next_auth.users(id) on delete cascade,
  date                           date not null,
  input_tokens                   bigint not null default 0,
  output_tokens                  bigint not null default 0,
  cache_creation_input_tokens    bigint not null default 0,
  cache_read_input_tokens        bigint not null default 0,
  messages                       int    not null default 0,
  sessions                       int    not null default 0,
  unique(user_id, date)
);

-- Migration for existing tables (run if tables already exist):
-- ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS total_cache_creation_input_tokens bigint not null default 0;
-- ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS total_cache_read_input_tokens bigint not null default 0;
-- ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS cache_creation_input_tokens bigint not null default 0;
-- ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS cache_read_input_tokens bigint not null default 0;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table next_auth.users enable row level security;
alter table next_auth.accounts enable row level security;
alter table next_auth.sessions enable row level security;
alter table next_auth.verification_tokens enable row level security;
alter table public.user_stats enable row level security;
alter table public.daily_activity enable row level security;

-- Service role bypasses RLS automatically
-- Public read access for leaderboard
create policy "public read users"          on next_auth.users     for select using (true);
create policy "public read user_stats"     on public.user_stats   for select using (true);
create policy "public read daily_activity" on public.daily_activity for select using (true);
