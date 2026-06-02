-- ============================================================
-- Instance governance and membership controls
-- ============================================================

create table if not exists public.instance_memberships (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  is_active boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists instance_memberships_single_owner_idx
  on public.instance_memberships (role)
  where role = 'owner';

create index if not exists instance_memberships_active_role_idx
  on public.instance_memberships (is_active, role, created_at);

create or replace function public.ensure_instance_membership(p_user_id uuid)
returns table (
  user_id uuid,
  role text,
  is_active boolean,
  deactivated_at timestamptz
)
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(6202001);

  if not exists (
    select 1
    from next_auth.users
    where id = p_user_id
  ) then
    raise exception 'User does not exist';
  end if;

  if not exists (
    select 1
    from public.instance_memberships m
    where m.user_id = p_user_id
  ) then
    insert into public.instance_memberships (user_id, role)
    values (
      p_user_id,
      case
        when exists (select 1 from public.instance_memberships) then 'member'
        else 'owner'
      end
    );
  end if;

  return query
  select m.user_id, m.role, m.is_active, m.deactivated_at
  from public.instance_memberships m
  where m.user_id = p_user_id;
end;
$$;

revoke all on function public.ensure_instance_membership(uuid) from public, anon, authenticated;
grant execute on function public.ensure_instance_membership(uuid) to service_role;

create or replace function leaderboard_private.bootstrap_instance_membership()
returns trigger
language plpgsql
security definer
set search_path = public, leaderboard_private, next_auth, pg_temp
as $$
begin
  perform public.ensure_instance_membership(new.id);
  return new;
end;
$$;

drop trigger if exists bootstrap_instance_membership_on_user_insert on next_auth.users;

create trigger bootstrap_instance_membership_on_user_insert
after insert on next_auth.users
for each row
execute function leaderboard_private.bootstrap_instance_membership();

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select id
    from next_auth.users
    order by id
  loop
    perform public.ensure_instance_membership(v_user_id);
  end loop;
end
$$;

create or replace function public.get_instance_membership(p_user_id uuid)
returns table (
  user_id uuid,
  role text,
  is_active boolean,
  deactivated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select m.user_id, m.role, m.is_active, m.deactivated_at
  from public.instance_memberships m
  where m.user_id = p_user_id
$$;

revoke all on function public.get_instance_membership(uuid) from public, anon, authenticated;
grant execute on function public.get_instance_membership(uuid) to service_role;

create or replace function public.list_instance_memberships()
returns table (
  user_id uuid,
  name text,
  email text,
  image text,
  role text,
  is_active boolean,
  deactivated_at timestamptz,
  created_at timestamptz,
  last_synced_at timestamptz,
  last_activity_date date
)
language sql
security definer
set search_path = public, next_auth, pg_temp
as $$
  select
    m.user_id,
    u.name,
    u.email,
    u.image,
    m.role,
    m.is_active,
    m.deactivated_at,
    m.created_at,
    s.last_synced_at,
    s.last_activity_date
  from public.instance_memberships m
  join next_auth.users u on u.id = m.user_id
  left join public.user_stats s on s.user_id = m.user_id
  order by
    m.is_active desc,
    case m.role
      when 'owner' then 0
      when 'admin' then 1
      else 2
    end,
    coalesce(u.name, u.email, m.user_id::text)
$$;

revoke all on function public.list_instance_memberships() from public, anon, authenticated;
grant execute on function public.list_instance_memberships() to service_role;

create or replace function public.set_instance_member_role(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text
)
returns table (
  user_id uuid,
  role text,
  is_active boolean,
  deactivated_at timestamptz
)
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_active boolean;
  v_target_role text;
  v_target_active boolean;
begin
  if p_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;

  select m.role, m.is_active
  into v_actor_role, v_actor_active
  from public.instance_memberships m
  where m.user_id = p_actor_user_id;

  if v_actor_role is distinct from 'owner' or v_actor_active is not true then
    raise exception 'Owner access required';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'Owners cannot change their own role';
  end if;

  select m.role, m.is_active
  into v_target_role, v_target_active
  from public.instance_memberships m
  where m.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Target user not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'Use ownership transfer to change the owner';
  end if;

  if v_target_active is not true then
    raise exception 'Inactive users cannot change roles';
  end if;

  update public.instance_memberships m
  set role = p_role,
      updated_at = now()
  where m.user_id = p_target_user_id;

  return query
  select m.user_id, m.role, m.is_active, m.deactivated_at
  from public.instance_memberships m
  where m.user_id = p_target_user_id;
end;
$$;

revoke all on function public.set_instance_member_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_instance_member_role(uuid, uuid, text) to service_role;

create or replace function public.transfer_instance_ownership(
  p_actor_user_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_active boolean;
  v_target_role text;
  v_target_active boolean;
begin
  perform pg_advisory_xact_lock(6202002);

  select m.role, m.is_active
  into v_actor_role, v_actor_active
  from public.instance_memberships m
  where m.user_id = p_actor_user_id;

  if v_actor_role is distinct from 'owner' or v_actor_active is not true then
    raise exception 'Owner access required';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'Ownership is already assigned to this user';
  end if;

  select m.role, m.is_active
  into v_target_role, v_target_active
  from public.instance_memberships m
  where m.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Target user not found';
  end if;

  if v_target_active is not true then
    raise exception 'Ownership can only be transferred to an active user';
  end if;

  update public.instance_memberships m
  set role = 'admin',
      updated_at = now()
  where m.user_id = p_actor_user_id;

  update public.instance_memberships m
  set role = 'owner',
      updated_at = now()
  where m.user_id = p_target_user_id;
end;
$$;

revoke all on function public.transfer_instance_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_instance_ownership(uuid, uuid) to service_role;

create or replace function public.set_instance_member_active(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_is_active boolean
)
returns table (
  user_id uuid,
  role text,
  is_active boolean,
  deactivated_at timestamptz
)
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_active boolean;
  v_target_role text;
  v_target_active boolean;
begin
  select m.role, m.is_active
  into v_actor_role, v_actor_active
  from public.instance_memberships m
  where m.user_id = p_actor_user_id;

  if v_actor_active is not true or v_actor_role not in ('owner', 'admin') then
    raise exception 'Admin access required';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'Users cannot change their own active state';
  end if;

  select m.role, m.is_active
  into v_target_role, v_target_active
  from public.instance_memberships m
  where m.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Target user not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'The owner cannot be deactivated';
  end if;

  if v_actor_role = 'admin' and v_target_role <> 'member' then
    raise exception 'Admins can only manage members';
  end if;

  update public.instance_memberships m
  set
    is_active = p_is_active,
    deactivated_at = case when p_is_active then null else now() end,
    updated_at = now()
  where m.user_id = p_target_user_id;

  delete from leaderboard_private.install_tokens
  where user_id = p_target_user_id
    and p_is_active is false;

  return query
  select m.user_id, m.role, m.is_active, m.deactivated_at
  from public.instance_memberships m
  where m.user_id = p_target_user_id;
end;
$$;

revoke all on function public.set_instance_member_active(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_instance_member_active(uuid, uuid, boolean) to service_role;

create or replace function public.admin_delete_account(
  p_actor_user_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  v_actor_role text;
  v_actor_active boolean;
  v_target_role text;
begin
  select role, is_active
  into v_actor_role, v_actor_active
  from public.instance_memberships
  where user_id = p_actor_user_id;

  if v_actor_active is not true or v_actor_role not in ('owner', 'admin') then
    raise exception 'Admin access required';
  end if;

  if p_actor_user_id = p_target_user_id then
    raise exception 'Use the profile page to delete your own member account';
  end if;

  select role
  into v_target_role
  from public.instance_memberships
  where user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Target user not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'The owner cannot be deleted';
  end if;

  if v_actor_role = 'admin' and v_target_role <> 'member' then
    raise exception 'Admins can only delete members';
  end if;

  delete from next_auth.users
  where id = p_target_user_id;
end;
$$;

revoke all on function public.admin_delete_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_account(uuid, uuid) to service_role;

create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, next_auth, pg_temp
as $$
declare
  v_role text;
begin
  select role
  into v_role
  from public.instance_memberships
  where user_id = p_user_id;

  if v_role in ('owner', 'admin') then
    raise exception 'Privileged accounts must be removed from the admin panel';
  end if;

  delete from next_auth.users
  where id = p_user_id;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;

alter table public.instance_memberships enable row level security;

drop policy if exists "deny all instance memberships" on public.instance_memberships;

create policy "deny all instance memberships"
on public.instance_memberships
for all
to authenticated, anon
using (false)
with check (false);

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
  from public.instance_memberships m
  where m.is_active = true;

  select count(distinct r.user_id)
  into v_users_with_raw_events
  from leaderboard_private.raw_usage_events r
  join public.instance_memberships m
    on m.user_id = r.user_id
   and m.is_active = true;

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
  from public.instance_memberships m
  join next_auth.users u on u.id = m.user_id
  left join public.user_stats s on s.user_id = u.id
  where m.is_active = true
    and not exists (
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

create or replace function public.ensure_sync_credential(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
declare
  v_sync_token uuid;
  v_is_active boolean;
begin
  perform public.ensure_instance_membership(p_user_id);

  select is_active
  into v_is_active
  from public.instance_memberships
  where user_id = p_user_id;

  if v_is_active is not true then
    raise exception 'User is inactive';
  end if;

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
  select c.user_id
  from leaderboard_private.sync_credentials c
  join public.instance_memberships m
    on m.user_id = c.user_id
   and m.is_active = true
  where c.sync_token = p_sync_token
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
  v_is_active boolean;
begin
  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'p_events must be a JSON array';
  end if;

  select is_active
  into v_is_active
  from public.instance_memberships
  where user_id = p_user_id;

  if v_is_active is not true then
    raise exception 'User is inactive';
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
  select u.id, u.name, u.image
  from next_auth.users u
  join public.instance_memberships m
    on m.user_id = u.id
   and m.is_active = true
  where u.id = any(p_user_ids)
$$;

revoke all on function public.get_public_users(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_users(uuid[]) to service_role;
