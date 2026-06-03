-- ============================================================
-- Schema for NextAuth adapter tables
-- ============================================================

create schema if not exists next_auth;

grant usage on schema next_auth to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema next_auth grant all on sequences to postgres, anon, authenticated, service_role;

create table if not exists next_auth.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);

create table if not exists next_auth.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, "providerAccountId")
);

create table if not exists next_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text unique not null,
  "userId" uuid not null references next_auth.users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists next_auth.verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

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

create table if not exists public.user_widget_settings (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  public_id text not null unique,
  is_published boolean not null default false,
  preset text not null default 'arcade',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_widget_settings_public_id_idx
  on public.user_widget_settings (public_id);

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

-- ============================================================
-- Rollup function
-- ============================================================

create or replace function public.refresh_leaderboard_rollups(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_anchor_date date;
  v_last_activity_date date;
  v_scan_date date;
  v_current_streak int := 0;
  v_longest_streak int := 0;
  v_model_usage jsonb := '{}'::jsonb;
begin
  delete from public.daily_activity
  where user_id = p_user_id;

  insert into public.daily_activity (
    user_id,
    date,
    input_tokens,
    output_tokens,
    cache_creation_input_tokens,
    cache_read_input_tokens,
    messages,
    sessions
  )
  select
    p_user_id,
    activity_date,
    sum(input_tokens),
    sum(output_tokens),
    sum(cache_creation_input_tokens),
    sum(cache_read_input_tokens),
    count(*)::int,
    count(distinct session_id)::int
  from leaderboard_private.raw_usage_events
  where user_id = p_user_id
  group by activity_date
  order by activity_date;

  select max(date)
  into v_last_activity_date
  from public.daily_activity
  where user_id = p_user_id;

  select max(date)
  into v_anchor_date
  from public.daily_activity
  where user_id = p_user_id
    and date in (current_date, current_date - 1);

  if v_anchor_date is not null then
    v_scan_date := v_anchor_date;
    loop
      exit when not exists (
        select 1
        from public.daily_activity
        where user_id = p_user_id
          and date = v_scan_date
      );

      v_current_streak := v_current_streak + 1;
      v_scan_date := v_scan_date - 1;
    end loop;
  end if;

  select coalesce(max(streak_length), 0)
  into v_longest_streak
  from (
    select count(*)::int as streak_length
    from (
      select
        date,
        date - row_number() over (order by date)::int as streak_group
      from public.daily_activity
      where user_id = p_user_id
    ) grouped_days
    group by streak_group
  ) streaks;

  select coalesce(
    jsonb_object_agg(model, model_total order by model_total desc),
    '{}'::jsonb
  )
  into v_model_usage
  from (
    select
      model,
      sum(
        input_tokens +
        output_tokens +
        cache_creation_input_tokens +
        cache_read_input_tokens
      )::bigint as model_total
    from leaderboard_private.raw_usage_events
    where user_id = p_user_id
    group by model
  ) model_totals;

  insert into public.user_stats (
    user_id,
    total_input_tokens,
    total_output_tokens,
    total_cache_creation_input_tokens,
    total_cache_read_input_tokens,
    total_messages,
    total_sessions,
    current_streak,
    longest_streak,
    models_used,
    last_synced_at,
    last_activity_date
  )
  select
    p_user_id,
    coalesce(sum(input_tokens), 0),
    coalesce(sum(output_tokens), 0),
    coalesce(sum(cache_creation_input_tokens), 0),
    coalesce(sum(cache_read_input_tokens), 0),
    count(*)::bigint,
    coalesce(count(distinct session_id), 0)::int,
    v_current_streak,
    v_longest_streak,
    v_model_usage,
    now(),
    v_last_activity_date
  from leaderboard_private.raw_usage_events
  where user_id = p_user_id
  on conflict (user_id) do update
  set
    total_input_tokens = excluded.total_input_tokens,
    total_output_tokens = excluded.total_output_tokens,
    total_cache_creation_input_tokens = excluded.total_cache_creation_input_tokens,
    total_cache_read_input_tokens = excluded.total_cache_read_input_tokens,
    total_messages = excluded.total_messages,
    total_sessions = excluded.total_sessions,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    models_used = excluded.models_used,
    last_synced_at = excluded.last_synced_at,
    last_activity_date = excluded.last_activity_date;
end;
$$;

revoke all on function public.refresh_leaderboard_rollups(uuid) from public, anon, authenticated;
grant execute on function public.refresh_leaderboard_rollups(uuid) to service_role;

create or replace function public.refresh_all_leaderboard_rollups()
returns integer
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_user_id uuid;
  v_count integer := 0;
begin
  delete from public.daily_activity;

  for v_user_id in
    select distinct user_id
    from leaderboard_private.raw_usage_events
  loop
    perform public.refresh_leaderboard_rollups(v_user_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.refresh_all_leaderboard_rollups() from public, anon, authenticated;
grant execute on function public.refresh_all_leaderboard_rollups() to service_role;

create or replace function public.bump_sync_generation()
returns jsonb
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_generation integer;
begin
  insert into leaderboard_private.system_state (singleton, sync_generation, updated_at)
  values (true, 2, now())
  on conflict (singleton) do update
  set
    sync_generation = leaderboard_private.system_state.sync_generation + 1,
    updated_at = now()
  returning sync_generation into v_generation;

  return jsonb_build_object(
    'ok', true,
    'sync_generation', v_generation
  );
end;
$$;

revoke all on function public.bump_sync_generation() from public, anon, authenticated;
grant execute on function public.bump_sync_generation() to service_role;

create or replace function public.get_leaderboard_sync_status()
returns jsonb
language plpgsql
security definer
set search_path = public, leaderboard_private, next_auth, pg_temp
as $$
declare
  v_generation integer := 1;
  v_total_users integer := 0;
  v_users_with_raw_events integer := 0;
  v_users_without_raw_events integer := 0;
  v_needs_sync jsonb := '[]'::jsonb;
begin
  select sync_generation
  into v_generation
  from leaderboard_private.system_state
  where singleton = true;

  select count(*)
  into v_total_users
  from next_auth.users;

  select count(distinct user_id)
  into v_users_with_raw_events
  from leaderboard_private.raw_usage_events;

  v_users_without_raw_events := greatest(v_total_users - v_users_with_raw_events, 0);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', u.id,
        'name', u.name,
        'email', u.email,
        'last_synced_at', s.last_synced_at,
        'last_activity_date', s.last_activity_date
      )
      order by coalesce(s.last_synced_at, 'epoch'::timestamptz), u.email
    ),
    '[]'::jsonb
  )
  into v_needs_sync
  from next_auth.users u
  left join public.user_stats s on s.user_id = u.id
  where not exists (
    select 1
    from leaderboard_private.raw_usage_events r
    where r.user_id = u.id
  );

  return jsonb_build_object(
    'sync_generation', coalesce(v_generation, 1),
    'total_users', v_total_users,
    'users_with_raw_events', v_users_with_raw_events,
    'users_without_raw_events', v_users_without_raw_events,
    'needs_sync', v_needs_sync
  );
end;
$$;

revoke all on function public.get_leaderboard_sync_status() from public, anon, authenticated;
grant execute on function public.get_leaderboard_sync_status() to service_role;

create or replace function public.reset_leaderboard_data()
returns jsonb
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_generation integer;
begin
  delete from leaderboard_private.raw_usage_events;
  delete from public.daily_activity;

  update public.user_stats
  set
    total_input_tokens = 0,
    total_output_tokens = 0,
    total_cache_creation_input_tokens = 0,
    total_cache_read_input_tokens = 0,
    total_messages = 0,
    total_sessions = 0,
    current_streak = 0,
    longest_streak = 0,
    models_used = '{}'::jsonb,
    last_synced_at = null,
    last_activity_date = null;

  insert into leaderboard_private.system_state (singleton, sync_generation, last_reset_at, updated_at)
  values (true, 2, now(), now())
  on conflict (singleton) do update
  set
    sync_generation = leaderboard_private.system_state.sync_generation + 1,
    last_reset_at = now(),
    updated_at = now()
  returning sync_generation into v_generation;

  return jsonb_build_object(
    'ok', true,
    'sync_generation', v_generation
  );
end;
$$;

revoke all on function public.reset_leaderboard_data() from public, anon, authenticated;
grant execute on function public.reset_leaderboard_data() to service_role;

create or replace function public.ensure_sync_credential(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_sync_token uuid;
begin
  insert into leaderboard_private.sync_credentials (user_id)
  values (p_user_id)
  on conflict (user_id) do update
  set updated_at = now()
  returning sync_token into v_sync_token;

  return v_sync_token;
end;
$$;

revoke all on function public.ensure_sync_credential(uuid) from public, anon, authenticated;
grant execute on function public.ensure_sync_credential(uuid) to service_role;

create or replace function public.issue_install_token(p_user_id uuid, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_token uuid;
begin
  perform public.ensure_sync_credential(p_user_id);

  insert into leaderboard_private.install_tokens (user_id, expires_at)
  values (p_user_id, p_expires_at)
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.issue_install_token(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.issue_install_token(uuid, timestamptz) to service_role;

create or replace function public.consume_install_token(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_user_id uuid;
begin
  update leaderboard_private.install_tokens
  set used_at = now()
  where token = p_token
    and used_at is null
    and expires_at > now()
  returning user_id into v_user_id;

  if v_user_id is null then
    return null;
  end if;

  return public.ensure_sync_credential(v_user_id);
end;
$$;

revoke all on function public.consume_install_token(uuid) from public, anon, authenticated;
grant execute on function public.consume_install_token(uuid) to service_role;

create or replace function public.get_user_id_for_sync_token(p_sync_token uuid)
returns uuid
language sql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
  select user_id
  from leaderboard_private.sync_credentials
  where sync_token = p_sync_token
$$;

revoke all on function public.get_user_id_for_sync_token(uuid) from public, anon, authenticated;
grant execute on function public.get_user_id_for_sync_token(uuid) to service_role;

create or replace function public.ingest_raw_usage_events(
  p_user_id uuid,
  p_script_version text,
  p_hostname text,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_row_count integer := 0;
  v_generation integer := 1;
begin
  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'p_events must be a JSON array';
  end if;

  insert into leaderboard_private.raw_usage_events (
    user_id,
    source,
    event_id,
    message_id,
    session_id,
    event_timestamp,
    activity_date,
    model,
    input_tokens,
    output_tokens,
    cache_creation_input_tokens,
    cache_read_input_tokens,
    stop_reason,
    source_path,
    script_version,
    hostname
  )
  select
    p_user_id,
    coalesce(source, 'claude'),
    event_id,
    message_id,
    session_id,
    event_timestamp,
    activity_date,
    model,
    input_tokens,
    output_tokens,
    cache_creation_input_tokens,
    cache_read_input_tokens,
    stop_reason,
    source_path,
    p_script_version,
    p_hostname
  from jsonb_to_recordset(p_events) as events(
    source text,
    event_id text,
    message_id text,
    session_id text,
    event_timestamp timestamptz,
    activity_date date,
    model text,
    input_tokens bigint,
    output_tokens bigint,
    cache_creation_input_tokens bigint,
    cache_read_input_tokens bigint,
    stop_reason text,
    source_path text
  )
  on conflict (user_id, event_id) do update
  set
    source = excluded.source,
    message_id = excluded.message_id,
    session_id = excluded.session_id,
    event_timestamp = excluded.event_timestamp,
    activity_date = excluded.activity_date,
    model = excluded.model,
    input_tokens = excluded.input_tokens,
    output_tokens = excluded.output_tokens,
    cache_creation_input_tokens = excluded.cache_creation_input_tokens,
    cache_read_input_tokens = excluded.cache_read_input_tokens,
    stop_reason = excluded.stop_reason,
    source_path = excluded.source_path,
    script_version = excluded.script_version,
    hostname = excluded.hostname,
    synced_at = now();

  get diagnostics v_row_count = row_count;

  perform public.refresh_leaderboard_rollups(p_user_id);

  select sync_generation
  into v_generation
  from leaderboard_private.system_state
  where singleton = true;

  return jsonb_build_object(
    'inserted_events', v_row_count,
    'sync_generation', coalesce(v_generation, 1)
  );
end;
$$;

revoke all on function public.ingest_raw_usage_events(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_raw_usage_events(uuid, text, text, jsonb) to service_role;

create or replace function public.get_public_users(p_user_ids uuid[])
returns table (
  id uuid,
  name text,
  image text
)
language sql
security definer
set search_path = public, next_auth, pg_temp
as $$
  select id, name, image
  from next_auth.users
  where id = any(p_user_ids)
$$;

revoke all on function public.get_public_users(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_users(uuid[]) to service_role;

create or replace function public.delete_account(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, next_auth, pg_temp
as $$
  delete from next_auth.users
  where id = p_user_id
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table next_auth.users enable row level security;
alter table next_auth.accounts enable row level security;
alter table next_auth.sessions enable row level security;
alter table next_auth.verification_tokens enable row level security;
alter table public.user_stats enable row level security;
alter table public.daily_activity enable row level security;
alter table public.user_widget_settings enable row level security;
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
drop policy if exists "deny all user widget settings" on public.user_widget_settings;
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

create policy "deny all user widget settings"
on public.user_widget_settings
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
