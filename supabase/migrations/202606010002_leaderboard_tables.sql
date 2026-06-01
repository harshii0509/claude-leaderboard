-- ============================================================
-- Private leaderboard storage
-- ============================================================

create schema if not exists leaderboard_private;

grant usage on schema leaderboard_private to postgres, service_role;
grant all on all tables in schema leaderboard_private to postgres, service_role;
grant all on all sequences in schema leaderboard_private to postgres, service_role;
alter default privileges in schema leaderboard_private grant all on tables to postgres, service_role;
alter default privileges in schema leaderboard_private grant all on sequences to postgres, service_role;

create table if not exists leaderboard_private.sync_credentials (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  sync_token uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leaderboard_private.install_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists install_tokens_user_id_idx
  on leaderboard_private.install_tokens (user_id, created_at desc);

create table if not exists leaderboard_private.raw_usage_events (
  id bigserial primary key,
  user_id uuid not null references next_auth.users(id) on delete cascade,
  source text not null default 'claude',
  event_id text not null,
  message_id text,
  session_id text not null,
  event_timestamp timestamptz not null,
  activity_date date not null,
  model text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_creation_input_tokens bigint not null default 0,
  cache_read_input_tokens bigint not null default 0,
  stop_reason text,
  source_path text,
  script_version text not null default '2.0.0',
  hostname text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists raw_usage_events_user_date_idx
  on leaderboard_private.raw_usage_events (user_id, activity_date desc);

create index if not exists raw_usage_events_user_session_idx
  on leaderboard_private.raw_usage_events (user_id, session_id);

create index if not exists raw_usage_events_user_model_idx
  on leaderboard_private.raw_usage_events (user_id, model);

alter table if exists leaderboard_private.raw_usage_events
  add column if not exists source text not null default 'claude';

create table if not exists leaderboard_private.system_state (
  singleton boolean primary key default true check (singleton),
  sync_generation integer not null default 1,
  last_reset_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into leaderboard_private.system_state (singleton)
values (true)
on conflict (singleton) do nothing;

-- ============================================================
-- Public derived tables used by the app UI
-- ============================================================

create table if not exists public.user_stats (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  total_input_tokens bigint not null default 0,
  total_output_tokens bigint not null default 0,
  total_cache_creation_input_tokens bigint not null default 0,
  total_cache_read_input_tokens bigint not null default 0,
  total_messages bigint not null default 0,
  total_sessions int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  models_used jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_activity_date date
);

alter table if exists public.user_stats
  add column if not exists last_activity_date date;

create table if not exists public.daily_activity (
  id bigserial primary key,
  user_id uuid not null references next_auth.users(id) on delete cascade,
  date date not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_creation_input_tokens bigint not null default 0,
  cache_read_input_tokens bigint not null default 0,
  messages int not null default 0,
  sessions int not null default 0,
  unique (user_id, date)
);

create index if not exists daily_activity_user_date_idx
  on public.daily_activity (user_id, date desc);

-- ============================================================
-- Data migration from legacy schema
-- ============================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_stats'
      and column_name = 'sync_token'
  ) then
    execute $migration$
      insert into leaderboard_private.sync_credentials (user_id, sync_token, created_at, updated_at)
      select user_id, sync_token, coalesce(last_synced_at, now()), now()
      from public.user_stats
      on conflict (user_id) do update
      set sync_token = excluded.sync_token,
          updated_at = now()
    $migration$;
  end if;
end
$$;

alter table if exists public.user_stats
  drop column if exists sync_token;
