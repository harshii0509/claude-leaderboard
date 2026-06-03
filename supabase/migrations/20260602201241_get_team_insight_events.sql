create or replace function public.get_team_insight_events(
  p_user_ids uuid[],
  p_since date default null
)
returns table (
  user_id uuid,
  source text,
  model text,
  activity_date date,
  input_tokens bigint,
  output_tokens bigint,
  cache_creation_input_tokens bigint,
  cache_read_input_tokens bigint
)
language sql
security definer
set search_path = public, leaderboard_private, pg_temp
as $$
  select
    r.user_id,
    r.source,
    r.model,
    r.activity_date,
    r.input_tokens,
    r.output_tokens,
    r.cache_creation_input_tokens,
    r.cache_read_input_tokens
  from leaderboard_private.raw_usage_events r
  join public.instance_memberships m
    on m.user_id = r.user_id
   and m.is_active = true
  where r.user_id = any(p_user_ids)
    and (p_since is null or r.activity_date >= p_since)
$$;

revoke all on function public.get_team_insight_events(uuid[], date) from public, anon, authenticated;
grant execute on function public.get_team_insight_events(uuid[], date) to service_role;
