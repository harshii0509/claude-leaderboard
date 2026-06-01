-- Demo seed for evaluating Claude Leaderboard without a real team rollout.
-- Safe intent:
-- - inserts synthetic users with fixed UUIDs
-- - inserts synthetic raw usage events
-- - rebuilds derived leaderboard tables from the existing rollup pipeline
--
-- This is meant for local or evaluation environments only.

do $$
declare
  v_user_ids uuid[] := array[
    '11111111-1111-4111-8111-111111111111'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid
  ];
begin
  delete from public.daily_activity where user_id = any(v_user_ids);
  delete from public.user_stats where user_id = any(v_user_ids);
  delete from leaderboard_private.raw_usage_events where user_id = any(v_user_ids);
  delete from leaderboard_private.sync_credentials where user_id = any(v_user_ids);
  delete from leaderboard_private.install_tokens where user_id = any(v_user_ids);
  delete from next_auth.sessions where "userId" = any(v_user_ids);
  delete from next_auth.accounts where "userId" = any(v_user_ids);
  delete from next_auth.users where id = any(v_user_ids);
end
$$;

insert into next_auth.users (id, name, email, image)
values
  ('11111111-1111-4111-8111-111111111111', 'Avery Chen', 'avery@example.com', null),
  ('22222222-2222-4222-8222-222222222222', 'Jordan Kim', 'jordan@example.com', null),
  ('33333333-3333-4333-8333-333333333333', 'Priya Patel', 'priya@example.com', null),
  ('44444444-4444-4444-8444-444444444444', 'Sam Rivera', 'sam@example.com', null),
  ('55555555-5555-4555-8555-555555555555', 'Taylor Brooks', 'taylor@example.com', null);

with demo_events as (
  select
    '11111111-1111-4111-8111-111111111111'::uuid as user_id,
    'claude'::text as source,
    format('demo-avery-%s', gs)::text as event_id,
    format('msg-avery-%s', gs)::text as message_id,
    format('avery-session-%s', gs)::text as session_id,
    ((current_date - gs)::timestamp + time '10:00')::timestamptz as event_timestamp,
    (current_date - gs)::date as activity_date,
    case when gs % 3 = 0 then 'claude-opus-4' else 'claude-sonnet-4' end::text as model,
    (4200 + (gs * 110))::bigint as input_tokens,
    (1500 + (gs * 45))::bigint as output_tokens,
    (200 + (gs * 10))::bigint as cache_creation_input_tokens,
    (500 + (gs * 20))::bigint as cache_read_input_tokens,
    'end_turn'::text as stop_reason,
    'demo-seed'::text as source_path,
    'demo-seed'::text as script_version,
    'local-demo'::text as hostname
  from generate_series(0, 13) as gs

  union all

  select
    '22222222-2222-4222-8222-222222222222'::uuid,
    'claude',
    format('demo-jordan-%s', gs),
    format('msg-jordan-%s', gs),
    format('jordan-session-%s', gs),
    ((current_date - gs)::timestamp + time '11:00')::timestamptz,
    (current_date - gs)::date,
    case when gs % 2 = 0 then 'claude-sonnet-4' else 'gpt-5' end,
    (3200 + (gs * 90))::bigint,
    (1200 + (gs * 35))::bigint,
    120::bigint,
    (420 + (gs * 15))::bigint,
    'end_turn',
    'demo-seed',
    'demo-seed',
    'local-demo'
  from generate_series(0, 6) as gs

  union all

  select
    '33333333-3333-4333-8333-333333333333'::uuid,
    'codex',
    format('demo-priya-%s', gs),
    format('msg-priya-%s', gs),
    format('priya-thread-%s', gs),
    ((current_date - gs)::timestamp + time '14:00')::timestamptz,
    (current_date - gs)::date,
    case when gs % 2 = 0 then 'gpt-5' else 'claude-sonnet-4' end,
    (2500 + (gs * 140))::bigint,
    (1700 + (gs * 80))::bigint,
    0::bigint,
    (260 + (gs * 18))::bigint,
    'user_input',
    'demo-seed',
    'demo-seed',
    'local-demo'
  from generate_series(2, 10) as gs

  union all

  select
    '44444444-4444-4444-8444-444444444444'::uuid,
    'claude',
    format('demo-sam-%s', gs),
    format('msg-sam-%s', gs),
    format('sam-session-%s', gs),
    ((current_date - gs)::timestamp + time '16:00')::timestamptz,
    (current_date - gs)::date,
    'claude-haiku-4',
    (1800 + (gs * 60))::bigint,
    (700 + (gs * 30))::bigint,
    90::bigint,
    (180 + (gs * 12))::bigint,
    'end_turn',
    'demo-seed',
    'demo-seed',
    'local-demo'
  from (values (0), (1), (4), (5), (8), (12), (15)) as seed(gs)

  union all

  select
    '55555555-5555-4555-8555-555555555555'::uuid,
    'codex',
    format('demo-taylor-%s', gs),
    format('msg-taylor-%s', gs),
    format('taylor-thread-%s', gs),
    ((current_date - gs)::timestamp + time '09:00')::timestamptz,
    (current_date - gs)::date,
    case when gs % 2 = 0 then 'gpt-5' else 'claude-opus-4' end,
    (5100 + (gs * 130))::bigint,
    (2300 + (gs * 95))::bigint,
    0::bigint,
    (620 + (gs * 20))::bigint,
    'user_input',
    'demo-seed',
    'demo-seed',
    'local-demo'
  from generate_series(0, 3) as gs
)
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
from demo_events;

select public.refresh_all_leaderboard_rollups();
