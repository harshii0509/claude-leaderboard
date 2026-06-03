import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTeamInsights, emptyTeamInsights } from '../lib/insights-core.ts'
import { queryTeamInsights } from '../lib/insights-query.ts'

const users = [
  { id: 'u1', name: 'Ava', image: null },
  { id: 'u2', name: 'Ben', image: null },
  { id: 'u3', name: 'Cam', image: null },
]

const activityRows = [
  {
    user_id: 'u1',
    date: '2026-05-29',
    input_tokens: 50,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u2',
    date: '2026-05-30',
    input_tokens: 300,
    output_tokens: 300,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 2,
    sessions: 2,
  },
  {
    user_id: 'u1',
    date: '2026-06-08',
    input_tokens: 100,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u1',
    date: '2026-06-09',
    input_tokens: 100,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u1',
    date: '2026-06-10',
    input_tokens: 50,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u2',
    date: '2026-06-06',
    input_tokens: 150,
    output_tokens: 150,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u2',
    date: '2026-06-10',
    input_tokens: 150,
    output_tokens: 150,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
  {
    user_id: 'u3',
    date: '2026-06-08',
    input_tokens: 200,
    output_tokens: 200,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    messages: 1,
    sessions: 1,
  },
]

const eventRows = [
  {
    user_id: 'u1',
    source: 'claude' as const,
    model: 'claude-sonnet-20260201',
    activity_date: '2026-06-08',
    input_tokens: 100,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u1',
    source: 'claude' as const,
    model: 'claude-opus-20260201',
    activity_date: '2026-06-09',
    input_tokens: 100,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u1',
    source: 'claude' as const,
    model: 'claude-sonnet-20260201',
    activity_date: '2026-06-10',
    input_tokens: 50,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u2',
    source: 'codex' as const,
    model: 'gpt-5-codex',
    activity_date: '2026-06-06',
    input_tokens: 150,
    output_tokens: 150,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u2',
    source: 'codex' as const,
    model: 'gpt-5-codex',
    activity_date: '2026-06-10',
    input_tokens: 150,
    output_tokens: 150,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u3',
    source: 'claude' as const,
    model: 'claude-sonnet-20260201',
    activity_date: '2026-06-08',
    input_tokens: 200,
    output_tokens: 200,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u1',
    source: 'claude' as const,
    model: 'claude-sonnet-20260201',
    activity_date: '2026-05-29',
    input_tokens: 50,
    output_tokens: 50,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  {
    user_id: 'u2',
    source: 'codex' as const,
    model: 'gpt-5-codex',
    activity_date: '2026-05-30',
    input_tokens: 300,
    output_tokens: 300,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
]

test('buildTeamInsights returns correct 7d snapshot, deltas, sources, models, and standouts', () => {
  const insights = buildTeamInsights(
    { activityRows, eventRows, users },
    '7d',
    new Date('2026-06-10T12:00:00Z'),
  )

  assert.equal(insights.snapshot.totalTokens, 1500)
  assert.equal(insights.snapshot.totalSessions, 6)
  assert.equal(insights.snapshot.activeUsers, 3)
  assert.equal(insights.snapshot.averageActiveDays, 2)

  assert.equal(insights.momentum.previousTokens, 700)
  assert.deepEqual(insights.momentum.delta, { absolute: 800, percentage: 114.3 })
  assert.equal(insights.momentum.series.length, 7)
  assert.equal(insights.momentum.series[0]?.date, '2026-06-04')
  assert.equal(insights.momentum.series[6]?.tokens, 400)

  assert.deepEqual(
    insights.sourceBreakdown.items.map((item) => ({
      source: item.source,
      tokens: item.tokens,
      percentage: item.percentage,
    })),
    [
      { source: 'claude', tokens: 900, percentage: 60 },
      { source: 'codex', tokens: 600, percentage: 40 },
    ],
  )

  assert.deepEqual(
    insights.topModels.map((item) => [item.model, item.count]),
    [
      ['claude-sonnet-20260201', 3],
      ['gpt-5-codex', 2],
      ['claude-opus-20260201', 1],
    ],
  )

  assert.equal(insights.standouts.mostActive?.user_id, 'u2')
  assert.equal(insights.standouts.biggestRiser?.user_id, 'u1')
  assert.equal(insights.standouts.biggestRiser?.deltaTokens, 400)
  assert.equal(insights.standouts.longestCurrentStreak?.user_id, 'u1')
  assert.equal(insights.standouts.longestCurrentStreak?.currentStreak, 3)
})

test('buildTeamInsights omits comparative fields for all-time views', () => {
  const insights = buildTeamInsights(
    { activityRows, eventRows, users },
    'all',
    new Date('2026-06-10T12:00:00Z'),
  )

  assert.equal(insights.snapshot.totalTokens, 2200)
  assert.equal(insights.momentum.previousTokens, null)
  assert.equal(insights.momentum.delta, null)
  assert.equal(insights.standouts.biggestRiser, null)
  assert.equal(insights.topModels[0]?.model, 'claude-sonnet-20260201')
})

test('emptyTeamInsights returns zeroed data with empty standouts', () => {
  const insights = emptyTeamInsights('30d')

  assert.equal(insights.snapshot.totalTokens, 0)
  assert.equal(insights.sourceBreakdown.items.length, 2)
  assert.equal(insights.topModels.length, 0)
  assert.equal(insights.standouts.mostActive, null)
})

test('queryTeamInsights scopes downstream queries to active users only', async () => {
  const recordedInCalls: Array<{ table: string; values: string[] }> = []
  const recordedRpcArgs: Array<{ name: string; args: Record<string, unknown> }> = []

  function makeBuilder<T>(table: string, result: { data: T; error: null }) {
    return {
      select() {
        return this
      },
      eq() {
        return this
      },
      in(_column: string, values: string[]) {
        recordedInCalls.push({ table, values })
        return this
      },
      gte() {
        return this
      },
      then(resolve: (value: { data: T; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(result).then(resolve, reject)
      },
    }
  }

  const client = {
    from(table: string) {
      if (table === 'instance_memberships') {
        return makeBuilder(table, {
          data: [{ user_id: 'u1' }, { user_id: 'u3' }],
          error: null,
        })
      }

      if (table === 'daily_activity') {
        return makeBuilder(table, {
          data: activityRows.filter((row) => row.user_id !== 'u2'),
          error: null,
        })
      }

      throw new Error(`Unexpected table ${table}`)
    },
    rpc(name: string, args: Record<string, unknown>) {
      recordedRpcArgs.push({ name, args })

      if (name === 'get_public_users') {
        return Promise.resolve({
          data: users.filter((user) => user.id !== 'u2'),
          error: null,
        })
      }

      if (name === 'get_team_insight_events') {
        return Promise.resolve({
          data: eventRows.filter((row) => row.user_id !== 'u2'),
          error: null,
        })
      }

      throw new Error(`Unexpected rpc ${name}`)
    },
  }

  const insights = await queryTeamInsights('all', client as never)

  assert.equal(insights.snapshot.activeUsers, 2)
  assert.deepEqual(
    recordedInCalls,
    [
      { table: 'daily_activity', values: ['u1', 'u3'] },
    ],
  )
  assert.deepEqual(recordedRpcArgs, [
    {
      name: 'get_public_users',
      args: { p_user_ids: ['u1', 'u3'] },
    },
    {
      name: 'get_team_insight_events',
      args: { p_user_ids: ['u1', 'u3'], p_since: null },
    },
  ])
})

test('queryTeamInsights passes a 7d since date to get_team_insight_events', async () => {
  const RealDate = Date

  global.Date = class extends RealDate {
    constructor(value?: string | number | Date) {
      super(value ?? '2026-06-10T12:00:00Z')
    }

    static now() {
      return new RealDate('2026-06-10T12:00:00Z').getTime()
    }
  } as DateConstructor

  try {
    const recordedRpcArgs: Array<{ name: string; args: Record<string, unknown> }> = []

    function makeBuilder<T>(result: { data: T; error: null }) {
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        in() {
          return this
        },
        then(resolve: (value: { data: T; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve(result).then(resolve, reject)
        },
      }
    }

    const client = {
      from(table: string) {
        if (table === 'instance_memberships') {
          return makeBuilder({
            data: [{ user_id: 'u1' }],
            error: null,
          })
        }

        if (table === 'daily_activity') {
          return makeBuilder({
            data: activityRows.filter((row) => row.user_id === 'u1'),
            error: null,
          })
        }

        throw new Error(`Unexpected table ${table}`)
      },
      rpc(name: string, args: Record<string, unknown>) {
        recordedRpcArgs.push({ name, args })

        if (name === 'get_public_users') {
          return Promise.resolve({
            data: users.filter((user) => user.id === 'u1'),
            error: null,
          })
        }

        if (name === 'get_team_insight_events') {
          return Promise.resolve({
            data: eventRows.filter((row) => row.user_id === 'u1'),
            error: null,
          })
        }

        throw new Error(`Unexpected rpc ${name}`)
      },
    }

    await queryTeamInsights('7d', client as never)

    assert.deepEqual(recordedRpcArgs[1], {
      name: 'get_team_insight_events',
      args: { p_user_ids: ['u1'], p_since: '2026-06-03' },
    })
  } finally {
    global.Date = RealDate
  }
})

test('migration defines get_team_insight_events as a service-role RPC over leaderboard_private', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260602201241_get_team_insight_events.sql', import.meta.url),
    'utf8',
  )

  assert.match(migration, /create or replace function public\.get_team_insight_events/i)
  assert.match(migration, /security definer/i)
  assert.match(migration, /from leaderboard_private\.raw_usage_events/i)
  assert.match(migration, /grant execute on function public\.get_team_insight_events\(uuid\[\], date\) to service_role/i)
})
