import { computeStreaks, totalTokens, type ActivityRow } from './leaderboard-math.ts'

export type InsightPeriod = '7d' | '30d' | 'all'

export interface InsightActivityRow extends ActivityRow {
  user_id: string
}

export interface InsightEventRow {
  user_id: string
  source: 'claude' | 'codex'
  model: string
  activity_date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

export interface InsightUserRow {
  id: string
  name: string | null
  image: string | null
}

export interface InsightDelta {
  absolute: number
  percentage: number | null
}

export interface InsightSeriesPoint {
  date: string
  tokens: number
}

export interface TeamSnapshot {
  totalTokens: number
  totalSessions: number
  activeUsers: number
  averageActiveDays: number
}

export interface SourceBreakdownItem {
  source: 'claude' | 'codex'
  label: string
  tokens: number
  events: number
  percentage: number
}

export interface TopModelItem {
  model: string
  count: number
  percentage: number
}

export interface MostActiveStandout {
  user_id: string
  name: string
  image: string | null
  tokens: number
}

export interface BiggestRiserStandout {
  user_id: string
  name: string
  image: string | null
  deltaTokens: number
  currentTokens: number
  previousTokens: number
}

export interface LongestCurrentStreakStandout {
  user_id: string
  name: string
  image: string | null
  currentStreak: number
}

export interface TeamInsights {
  period: InsightPeriod
  snapshot: TeamSnapshot
  momentum: {
    series: InsightSeriesPoint[]
    totalTokens: number
    previousTokens: number | null
    delta: InsightDelta | null
  }
  sourceBreakdown: {
    items: SourceBreakdownItem[]
    totalTokens: number
    totalEvents: number
  }
  topModels: TopModelItem[]
  standouts: {
    mostActive: MostActiveStandout | null
    biggestRiser: BiggestRiserStandout | null
    longestCurrentStreak: LongestCurrentStreakStandout | null
  }
}

const PERIOD_DAYS: Record<Exclude<InsightPeriod, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
}

function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildDelta(current: number, previous: number): InsightDelta | null {
  const absolute = current - previous
  const percentage = previous > 0 ? (absolute / previous) * 100 : null
  return { absolute, percentage: percentage == null ? null : roundTo(percentage, 1) }
}

function buildRangeSeries(
  start: Date,
  end: Date,
  tokensByDate: Map<string, number>,
): InsightSeriesPoint[] {
  const series: InsightSeriesPoint[] = []
  const cursor = startOfDay(start)
  const last = startOfDay(end)

  while (cursor.getTime() <= last.getTime()) {
    const key = dateKey(cursor)
    series.push({
      date: key,
      tokens: tokensByDate.get(key) ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return series
}

function getPeriodDays(period: InsightPeriod): number | null {
  if (period === 'all') return null
  return PERIOD_DAYS[period]
}

function getUserName(usersById: Map<string, InsightUserRow>, userId: string): string {
  return usersById.get(userId)?.name ?? 'Unknown'
}

function getUserImage(usersById: Map<string, InsightUserRow>, userId: string): string | null {
  return usersById.get(userId)?.image ?? null
}

export function isInsightPeriod(value: string | null | undefined): value is InsightPeriod {
  return value === '7d' || value === '30d' || value === 'all'
}

export function emptyTeamInsights(period: InsightPeriod): TeamInsights {
  return {
    period,
    snapshot: {
      totalTokens: 0,
      totalSessions: 0,
      activeUsers: 0,
      averageActiveDays: 0,
    },
    momentum: {
      series: [],
      totalTokens: 0,
      previousTokens: period === 'all' ? null : 0,
      delta: null,
    },
    sourceBreakdown: {
      items: [
        { source: 'claude', label: 'Claude', tokens: 0, events: 0, percentage: 0 },
        { source: 'codex', label: 'Codex', tokens: 0, events: 0, percentage: 0 },
      ],
      totalTokens: 0,
      totalEvents: 0,
    },
    topModels: [],
    standouts: {
      mostActive: null,
      biggestRiser: null,
      longestCurrentStreak: null,
    },
  }
}

export function buildTeamInsights(
  {
    activityRows,
    eventRows,
    users,
  }: {
    activityRows: InsightActivityRow[]
    eventRows: InsightEventRow[]
    users: InsightUserRow[]
  },
  period: InsightPeriod,
  today = new Date(),
): TeamInsights {
  if (activityRows.length === 0 && eventRows.length === 0) {
    return emptyTeamInsights(period)
  }

  const usersById = new Map(users.map((user) => [user.id, user]))
  const days = getPeriodDays(period)
  const todayStart = startOfDay(today)
  const currentStart = days == null ? null : addDays(todayStart, -(days - 1))
  const previousStart = currentStart == null || days == null ? null : addDays(currentStart, -days)
  const previousEnd = currentStart == null ? null : addDays(currentStart, -1)

  const currentActivityRows =
    currentStart == null
      ? activityRows
      : activityRows.filter((row) => row.date >= dateKey(currentStart) && row.date <= dateKey(todayStart))
  const previousActivityRows =
    previousStart == null || previousEnd == null
      ? []
      : activityRows.filter((row) => row.date >= dateKey(previousStart) && row.date <= dateKey(previousEnd))

  const snapshotByUser = new Map<string, { tokens: number; sessions: number; activeDays: number }>()
  for (const row of currentActivityRows) {
    const existing = snapshotByUser.get(row.user_id) ?? { tokens: 0, sessions: 0, activeDays: 0 }
    existing.tokens += totalTokens(row)
    existing.sessions += row.sessions
    existing.activeDays += 1
    snapshotByUser.set(row.user_id, existing)
  }

  const previousTokensByUser = new Map<string, number>()
  for (const row of previousActivityRows) {
    previousTokensByUser.set(row.user_id, (previousTokensByUser.get(row.user_id) ?? 0) + totalTokens(row))
  }

  const totalTokensCurrent = currentActivityRows.reduce((sum, row) => sum + totalTokens(row), 0)
  const totalSessionsCurrent = currentActivityRows.reduce((sum, row) => sum + row.sessions, 0)
  const totalTokensPrevious = previousActivityRows.reduce((sum, row) => sum + totalTokens(row), 0)
  const activeUsers = snapshotByUser.size
  const averageActiveDays =
    activeUsers > 0
      ? roundTo(
          Array.from(snapshotByUser.values()).reduce((sum, row) => sum + row.activeDays, 0) / activeUsers,
          1,
        )
      : 0

  const tokensByDate = new Map<string, number>()
  for (const row of currentActivityRows) {
    tokensByDate.set(row.date, (tokensByDate.get(row.date) ?? 0) + totalTokens(row))
  }

  const series =
    currentActivityRows.length === 0
      ? []
      : buildRangeSeries(
          currentStart ?? new Date(`${currentActivityRows[0].date}T00:00:00`),
          todayStart,
          tokensByDate,
        )

  const filteredEvents =
    currentStart == null
      ? eventRows
      : eventRows.filter((row) => row.activity_date >= dateKey(currentStart) && row.activity_date <= dateKey(todayStart))

  const sourceStats = new Map<'claude' | 'codex', { tokens: number; events: number }>([
    ['claude', { tokens: 0, events: 0 }],
    ['codex', { tokens: 0, events: 0 }],
  ])
  const modelCounts = new Map<string, number>()
  let totalEventTokens = 0

  for (const row of filteredEvents) {
    const source = sourceStats.get(row.source) ?? { tokens: 0, events: 0 }
    const tokens = totalTokens(row)
    source.tokens += tokens
    source.events += 1
    sourceStats.set(row.source, source)
    modelCounts.set(row.model, (modelCounts.get(row.model) ?? 0) + 1)
    totalEventTokens += tokens
  }

  const totalEvents = filteredEvents.length
  const sourceBreakdownItems: SourceBreakdownItem[] = ([
    ['claude', 'Claude'],
    ['codex', 'Codex'],
  ] as const).map(([source, label]) => {
    const stats = sourceStats.get(source) ?? { tokens: 0, events: 0 }
    return {
      source,
      label,
      tokens: stats.tokens,
      events: stats.events,
      percentage: totalEventTokens > 0 ? roundTo((stats.tokens / totalEventTokens) * 100, 1) : 0,
    }
  })

  const topModels = Array.from(modelCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([model, count]) => ({
      model,
      count,
      percentage: totalEvents > 0 ? roundTo((count / totalEvents) * 100, 1) : 0,
    }))

  const mostActiveEntry = Array.from(snapshotByUser.entries())
    .sort((a, b) => b[1].tokens - a[1].tokens || b[1].sessions - a[1].sessions || a[0].localeCompare(b[0]))[0]
  const mostActive =
    mostActiveEntry && mostActiveEntry[1].tokens > 0
      ? {
          user_id: mostActiveEntry[0],
          name: getUserName(usersById, mostActiveEntry[0]),
          image: getUserImage(usersById, mostActiveEntry[0]),
          tokens: mostActiveEntry[1].tokens,
        }
      : null

  const biggestRiser =
    days == null
      ? null
      : Array.from(
          new Set([...snapshotByUser.keys(), ...previousTokensByUser.keys()]),
        )
          .map((userId) => {
            const currentTokens = snapshotByUser.get(userId)?.tokens ?? 0
            const previousTokens = previousTokensByUser.get(userId) ?? 0
            return {
              user_id: userId,
              name: getUserName(usersById, userId),
              image: getUserImage(usersById, userId),
              deltaTokens: currentTokens - previousTokens,
              currentTokens,
              previousTokens,
            }
          })
          .filter((entry) => entry.deltaTokens > 0)
          .sort((a, b) => b.deltaTokens - a.deltaTokens || b.currentTokens - a.currentTokens || a.user_id.localeCompare(b.user_id))[0] ?? null

  const allDatesByUser = new Map<string, string[]>()
  for (const row of activityRows) {
    const existing = allDatesByUser.get(row.user_id)
    if (existing) existing.push(row.date)
    else allDatesByUser.set(row.user_id, [row.date])
  }

  const longestCurrentStreak =
    Array.from(allDatesByUser.entries())
      .map(([userId, dates]) => {
        const streak = computeStreaks(dates, today)
        return {
          user_id: userId,
          name: getUserName(usersById, userId),
          image: getUserImage(usersById, userId),
          currentStreak: streak.current,
        }
      })
      .filter((entry) => entry.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak || a.user_id.localeCompare(b.user_id))[0] ?? null

  return {
    period,
    snapshot: {
      totalTokens: totalTokensCurrent,
      totalSessions: totalSessionsCurrent,
      activeUsers,
      averageActiveDays,
    },
    momentum: {
      series,
      totalTokens: totalTokensCurrent,
      previousTokens: days == null ? null : totalTokensPrevious,
      delta: days == null ? null : buildDelta(totalTokensCurrent, totalTokensPrevious),
    },
    sourceBreakdown: {
      items: sourceBreakdownItems,
      totalTokens: totalEventTokens,
      totalEvents,
    },
    topModels,
    standouts: {
      mostActive,
      biggestRiser,
      longestCurrentStreak,
    },
  }
}
