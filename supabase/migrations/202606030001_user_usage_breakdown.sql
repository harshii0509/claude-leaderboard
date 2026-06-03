create or replace function public.get_user_usage_breakdown(p_user_id uuid)
returns table (
  source text,
  model text,
  input_tokens bigint,
  output_tokens bigint,
  cache_creation_input_tokens bigint,
  cache_read_input_tokens bigint,
  sessions integer,
  events integer,
  source_total_sessions integer,
  source_total_events integer
)
language sql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
  with active_user as (
    select 1
    from public.instance_memberships
    where user_id = p_user_id
      and is_active = true
  ),
  model_totals as (
    select
      r.source,
      r.model,
      sum(r.input_tokens)::bigint as input_tokens,
      sum(r.output_tokens)::bigint as output_tokens,
      sum(r.cache_creation_input_tokens)::bigint as cache_creation_input_tokens,
      sum(r.cache_read_input_tokens)::bigint as cache_read_input_tokens,
      count(distinct r.session_id)::int as sessions,
      count(*)::int as events
    from leaderboard_private.raw_usage_events r
    where r.user_id = p_user_id
      and exists (select 1 from active_user)
    group by r.source, r.model
  ),
  source_totals as (
    select
      r.source,
      count(distinct r.session_id)::int as source_total_sessions,
      count(*)::int as source_total_events
    from leaderboard_private.raw_usage_events r
    where r.user_id = p_user_id
      and exists (select 1 from active_user)
    group by r.source
  )
  select
    m.source,
    m.model,
    m.input_tokens,
    m.output_tokens,
    m.cache_creation_input_tokens,
    m.cache_read_input_tokens,
    m.sessions,
    m.events,
    s.source_total_sessions,
    s.source_total_events
  from model_totals m
  join source_totals s using (source)
  order by
    case m.source
      when 'claude' then 1
      when 'codex' then 2
      when 'opencode' then 3
      else 99
    end,
    (
      m.input_tokens +
      m.output_tokens +
      m.cache_creation_input_tokens +
      m.cache_read_input_tokens
    ) desc,
    m.model
$$;

revoke all on function public.get_user_usage_breakdown(uuid) from public, anon, authenticated;
grant execute on function public.get_user_usage_breakdown(uuid) to service_role;
