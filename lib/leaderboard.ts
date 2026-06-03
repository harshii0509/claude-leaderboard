import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from './db'
import {
  computeStreaks,
  computeWeeklyScore,
  daysUntilNextWeek,
  seasonWindow,
  startOfWeek,
  totalTokens,
  type ActivityRow,
} from './leaderboard-math'
import {
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardSort,
  type LeaderboardView,
  type TeamQuest,
  type WeeklyHighlight,
  type WeeklySeasonSummary,
} from './leaderboard-types'
import { isMissingInstanceGovernanceError } from './instance-governance'

type UserStatRow = {
  user_id: string
  total_input_tokens: number | null
  total_output_tokens: number | null
  total_cache_creation_input_tokens: number | null
  total_cache_read_input_tokens: number | null
  total_messages: number | null
  total_sessions: number | null
  longest_streak: number | null
  models_used: Record<string, number> | null
  last_synced_at: string | null
}

type UserRow = {
  id: string
  name: string | null
  image: string | null
}

type ActivityDbRow = ActivityRow & {
  user_id: string
}

type BaseLeaderboardData = {
  rows: LeaderboardEntry[]
  allActivityByUser: Map<string, ActivityDbRow[]>
  totalMembers: number
}

type PeriodBounds = {
  since: string
  until: string
}

function normalizePeriod(period: string): Exclude<LeaderboardPeriod, '7d'> {
  if (period === '30d') return '30d'
  if (period === 'week' || period === '7d') return 'week'
  return 'all'
}

function normalizeSort(sort: string): LeaderboardSort {
  if (sort === 'tokens' || sort === 'messages' || sort === 'streak' || sort === 'weekly') {
    return sort
  }
  return 'tokens'
}

function periodBounds(period: Exclude<LeaderboardPeriod, '7d'>, today = new Date()): PeriodBounds | null {
  if (period === 'all') return null

  if (period === 'week') {
    const since = startOfWeek(today)
    const until = new Date(today)
    until.setHours(23, 59, 59, 999)

    return {
      since: since.toISOString().slice(0, 10),
      until: until.toISOString().slice(0, 10),
    }
  }

  const since = new Date(today)
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 29)

  const until = new Date(today)
  until.setHours(23, 59, 59, 999)

  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  }
}

function withinBounds(row: ActivityDbRow, bounds: PeriodBounds | null): boolean {
  if (!bounds) return true
  return row.date >= bounds.since && row.date <= bounds.until
}

function mapStatRow(
  row: UserStatRow,
  usersMap: Record<string, { name: string | null; image: string | null }>,
): LeaderboardEntry {
  const input = row.total_input_tokens ?? 0
  const output = row.total_output_tokens ?? 0
  const cacheCreation = row.total_cache_creation_input_tokens ?? 0
  const cacheRead = row.total_cache_read_input_tokens ?? 0

  return {
    user_id: row.user_id,
    name: usersMap[row.user_id]?.name ?? 'Unknown',
    image: usersMap[row.user_id]?.image ?? null,
    total_input_tokens: input,
    total_output_tokens: output,
    total_cache_creation_input_tokens: cacheCreation,
    total_cache_read_input_tokens: cacheRead,
    total_tokens: input + output + cacheCreation + cacheRead,
    total_messages: row.total_messages ?? 0,
    total_sessions: row.total_sessions ?? 0,
    current_streak: 0,
    longest_streak: row.longest_streak ?? 0,
    models_used: row.models_used ?? {},
    last_synced_at: row.last_synced_at,
    rank_delta: 0,
    weekly_score: 0,
    active_days: 0,
  }
}

function sortEntries(rows: LeaderboardEntry[], sort: LeaderboardSort) {
  rows.sort((a, b) => {
    if (sort === 'messages') {
      return b.total_messages - a.total_messages || b.total_tokens - a.total_tokens
    }
    if (sort === 'streak') {
      return b.current_streak - a.current_streak || b.weekly_score - a.weekly_score || b.total_tokens - a.total_tokens
    }
    if (sort === 'weekly') {
      return b.weekly_score - a.weekly_score || b.active_days - a.active_days || b.total_tokens - a.total_tokens
    }
    return b.total_tokens - a.total_tokens || b.weekly_score - a.weekly_score || b.total_messages - a.total_messages
  })
}

function buildPeriodEntries(
  rows: LeaderboardEntry[],
  activityByUser: Map<string, ActivityDbRow[]>,
  period: Exclude<LeaderboardPeriod, '7d'>,
  today = new Date(),
): LeaderboardEntry[] {
  const bounds = periodBounds(period, today)

  return rows.map((entry) => {
    const relevantActivity = (activityByUser.get(entry.user_id) ?? []).filter((row) => withinBounds(row, bounds))
    const streaks = computeStreaks(relevantActivity.map((row) => row.date), today)
    const weeklyScore = computeWeeklyScore(relevantActivity)

    if (period === 'all') {
      return {
        ...entry,
        current_streak: computeStreaks((activityByUser.get(entry.user_id) ?? []).map((row) => row.date), today).current,
        weekly_score: weeklyScore.score,
        active_days: weeklyScore.activeDays,
      }
    }

    return {
      ...entry,
      total_input_tokens: relevantActivity.reduce((sum, row) => sum + row.input_tokens, 0),
      total_output_tokens: relevantActivity.reduce((sum, row) => sum + row.output_tokens, 0),
      total_cache_creation_input_tokens: relevantActivity.reduce((sum, row) => sum + row.cache_creation_input_tokens, 0),
      total_cache_read_input_tokens: relevantActivity.reduce((sum, row) => sum + row.cache_read_input_tokens, 0),
      total_tokens: relevantActivity.reduce((sum, row) => sum + totalTokens(row), 0),
      total_messages: relevantActivity.reduce((sum, row) => sum + row.messages, 0),
      total_sessions: relevantActivity.reduce((sum, row) => sum + row.sessions, 0),
      current_streak: streaks.current,
      longest_streak: streaks.longest,
      weekly_score: weeklyScore.score,
      active_days: weeklyScore.activeDays,
    }
  })
}

function computeWeekRankDelta(
  weeklyEntries: LeaderboardEntry[],
  baseRows: LeaderboardEntry[],
  activityByUser: Map<string, ActivityDbRow[]>,
  today = new Date(),
) {
  const currentWeekStart = startOfWeek(today)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekEnd = new Date(currentWeekStart)
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)

  const bounds = {
    since: previousWeekStart.toISOString().slice(0, 10),
    until: previousWeekEnd.toISOString().slice(0, 10),
  }

  const previousEntries = baseRows.map((entry) => {
    const relevantActivity = (activityByUser.get(entry.user_id) ?? []).filter((row) => withinBounds(row, bounds))
    const streaks = computeStreaks(relevantActivity.map((row) => row.date), previousWeekEnd)
    const weeklyScore = computeWeeklyScore(relevantActivity)

    return {
      ...entry,
      total_input_tokens: relevantActivity.reduce((sum, row) => sum + row.input_tokens, 0),
      total_output_tokens: relevantActivity.reduce((sum, row) => sum + row.output_tokens, 0),
      total_cache_creation_input_tokens: relevantActivity.reduce((sum, row) => sum + row.cache_creation_input_tokens, 0),
      total_cache_read_input_tokens: relevantActivity.reduce((sum, row) => sum + row.cache_read_input_tokens, 0),
      total_tokens: relevantActivity.reduce((sum, row) => sum + totalTokens(row), 0),
      total_messages: relevantActivity.reduce((sum, row) => sum + row.messages, 0),
      total_sessions: relevantActivity.reduce((sum, row) => sum + row.sessions, 0),
      current_streak: streaks.current,
      longest_streak: streaks.longest,
      weekly_score: weeklyScore.score,
      active_days: weeklyScore.activeDays,
    }
  })

  sortEntries(previousEntries, 'weekly')

  const previousRankByUser = new Map<string, number>()
  previousEntries.forEach((entry, index) => {
    previousRankByUser.set(entry.user_id, index + 1)
  })

  return new Map(
    weeklyEntries.map((entry, index) => {
      const currentRank = index + 1
      const previousRank = previousRankByUser.get(entry.user_id) ?? currentRank
      return [entry.user_id, previousRank - currentRank]
    }),
  )
}

function buildHighlights(
  entries: LeaderboardEntry[],
  activityByUser: Map<string, ActivityDbRow[]>,
  weekStart: string,
): WeeklyHighlight[] {
  const activeEntries = entries.filter((entry) => entry.active_days > 0)
  if (activeEntries.length === 0) return []

  const biggestClimber = [...activeEntries]
    .sort((a, b) => b.rank_delta - a.rank_delta || b.weekly_score - a.weekly_score)[0]

  const mostConsistent = [...activeEntries]
    .sort((a, b) => b.active_days - a.active_days || b.weekly_score - a.weekly_score)[0]

  const explorer = [...activeEntries]
    .sort((a, b) => Object.keys(b.models_used).length - Object.keys(a.models_used).length || b.weekly_score - a.weekly_score)[0]

  const comeback = [...activeEntries]
    .map((entry) => {
      const priorActivity = (activityByUser.get(entry.user_id) ?? [])
        .filter((row) => row.date < weekStart)
        .sort((a, b) => a.date.localeCompare(b.date))
      const lastBeforeWeek = priorActivity.at(-1)?.date ?? null
      const gap = lastBeforeWeek
        ? Math.round((new Date(`${weekStart}T00:00:00`).getTime() - new Date(`${lastBeforeWeek}T00:00:00`).getTime()) / 86_400_000)
        : 0

      return { entry, gap }
    })
    .filter(({ entry, gap }) => entry.active_days >= 2 && gap >= 7)
    .sort((a, b) => b.gap - a.gap || b.entry.weekly_score - a.entry.weekly_score)[0]

  const highlights: WeeklyHighlight[] = []

  if (biggestClimber) {
    highlights.push({
      id: 'climber',
      title: 'Biggest Climber',
      label: biggestClimber.name,
      detail: biggestClimber.rank_delta > 0 ? `Up ${biggestClimber.rank_delta} spots this week.` : 'Holding ground and pushing forward.',
      tone: 'blue',
      userId: biggestClimber.user_id,
    })
  }

  if (mostConsistent) {
    highlights.push({
      id: 'consistent',
      title: 'Most Consistent',
      label: mostConsistent.name,
      detail: `${mostConsistent.active_days} active day${mostConsistent.active_days === 1 ? '' : 's'} already this week.`,
      tone: 'green',
      userId: mostConsistent.user_id,
    })
  }

  if (comeback) {
    highlights.push({
      id: 'comeback',
      title: 'Comeback Badge',
      label: comeback.entry.name,
      detail: `Back after a ${comeback.gap}-day gap and back on the board.`,
      tone: 'gold',
      userId: comeback.entry.user_id,
    })
  }

  if (explorer) {
    highlights.push({
      id: 'explorer',
      title: 'Explorer Badge',
      label: explorer.name,
      detail: `${Object.keys(explorer.models_used).length} model${Object.keys(explorer.models_used).length === 1 ? '' : 's'} in the toolkit.`,
      tone: 'purple',
      userId: explorer.user_id,
    })
  }

  return highlights.slice(0, 4)
}

function buildQuests(totalMembers: number, activeMembers: number, totalActiveDays: number): TeamQuest[] {
  if (totalMembers === 0) return []

  const syncTarget = totalMembers
  const activeTarget = Math.min(totalMembers, Math.max(3, Math.ceil(totalMembers * 0.7)))
  const rhythmTarget = Math.max(6, Math.min(totalMembers * 4, totalMembers * 7))

  return [
    {
      id: 'weekly-sync',
      title: 'Team Quest: Everybody Shows Up',
      detail: 'Every active member syncs at least once this week.',
      progress: activeMembers,
      target: syncTarget,
    },
    {
      id: 'active-roster',
      title: 'Team Quest: Fill The Lineup',
      detail: `Reach ${activeTarget} active members before Monday reset.`,
      progress: activeMembers,
      target: activeTarget,
    },
    {
      id: 'active-days',
      title: 'Team Quest: Build A Rhythm',
      detail: `Stack ${rhythmTarget} combined active days this week.`,
      progress: totalActiveDays,
      target: rhythmTarget,
    },
  ]
}

function buildSeasonSummary(
  entries: LeaderboardEntry[],
  activityByUser: Map<string, ActivityDbRow[]>,
  totalMembers: number,
  today = new Date(),
): WeeklySeasonSummary | null {
  if (entries.length === 0) return null

  const window = seasonWindow(today)
  const crown = entries[0] ?? null
  const activeMembers = entries.filter((entry) => entry.active_days > 0).length
  const totalActiveDays = entries.reduce((sum, entry) => sum + entry.active_days, 0)

  return {
    label: `${window.start} to ${window.end}`,
    start_date: window.start,
    end_date: window.end,
    resets_in_days: daysUntilNextWeek(today),
    crown_user_id: crown?.user_id ?? null,
    crown_name: crown?.name ?? null,
    crown_score: crown?.weekly_score ?? 0,
    active_members: activeMembers,
    total_members: totalMembers,
    total_active_days: totalActiveDays,
    highlights: buildHighlights(entries, activityByUser, window.start),
    quests: buildQuests(totalMembers, activeMembers, totalActiveDays),
  }
}

async function fetchBaseLeaderboardData(): Promise<BaseLeaderboardData> {
  let activeUserIds: string[] | null = null

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('instance_memberships')
    .select('user_id')
    .eq('is_active', true)

  if (membershipError) {
    if (isMissingInstanceGovernanceError(membershipError)) {
      console.warn('[leaderboard][fallback:missing-instance-governance]', membershipError.message)
    } else {
      throw new Error(membershipError.message)
    }
  } else {
    activeUserIds = (memberships ?? []).map((row) => row.user_id as string)
    if (activeUserIds.length === 0) {
      return { rows: [], allActivityByUser: new Map(), totalMembers: 0 }
    }
  }

  const statsQuery = supabaseAdmin
    .from('user_stats')
    .select('user_id,total_input_tokens,total_output_tokens,total_cache_creation_input_tokens,total_cache_read_input_tokens,total_messages,total_sessions,longest_streak,models_used,last_synced_at')
  const { data: stats, error } = activeUserIds
    ? await statsQuery.in('user_id', activeUserIds)
    : await statsQuery

  if (error) throw new Error(error.message)

  const typedStats = (stats ?? []) as UserStatRow[]
  if (typedStats.length === 0) {
    return { rows: [], allActivityByUser: new Map(), totalMembers: activeUserIds?.length ?? 0 }
  }

  const userIds = typedStats.map((row) => row.user_id)
  const usersMap: Record<string, { name: string | null; image: string | null }> = {}

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabaseAdmin.rpc('get_public_users', {
      p_user_ids: userIds,
    })

    if (usersError) throw new Error(usersError.message)

    for (const user of (users ?? []) as UserRow[]) {
      usersMap[user.id] = { name: user.name, image: user.image }
    }
  }

  const activityQuery = supabaseAdmin
    .from('daily_activity')
    .select('user_id,date,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,messages,sessions')
  const { data: activity, error: activityError } = userIds.length > 0
    ? await activityQuery.in('user_id', userIds)
    : await activityQuery

  if (activityError) throw new Error(activityError.message)

  const allActivityByUser = new Map<string, ActivityDbRow[]>()
  for (const row of (activity ?? []) as ActivityDbRow[]) {
    const existing = allActivityByUser.get(row.user_id)
    if (existing) existing.push(row)
    else allActivityByUser.set(row.user_id, [row])
  }

  const rows = typedStats.map((row) => {
    const entry = mapStatRow(row, usersMap)
    const streaks = computeStreaks((allActivityByUser.get(entry.user_id) ?? []).map((activityRow) => activityRow.date))

    return {
      ...entry,
      current_streak: streaks.current,
    }
  })

  return {
    rows,
    allActivityByUser,
    totalMembers: activeUserIds?.length ?? typedStats.length,
  }
}

async function queryLeaderboardView(sortParam: string, periodParam: string): Promise<LeaderboardView> {
  const sort = normalizeSort(sortParam)
  const period = normalizePeriod(periodParam)
  const base = await fetchBaseLeaderboardData()

  let entries = buildPeriodEntries(base.rows, base.allActivityByUser, period)
  sortEntries(entries, sort)

  if (period === 'week') {
    const weeklyRanked = [...entries]
    sortEntries(weeklyRanked, 'weekly')

    const rankDeltaByUser = computeWeekRankDelta(weeklyRanked, base.rows, base.allActivityByUser)
    const weeklyRankedWithDelta = weeklyRanked.map((entry) => ({
      ...entry,
      rank_delta: rankDeltaByUser.get(entry.user_id) ?? 0,
    }))
    entries = entries.map((entry) => ({
      ...entry,
      rank_delta: rankDeltaByUser.get(entry.user_id) ?? 0,
    }))

    sortEntries(entries, sort)

    return {
      entries,
      sort,
      period,
      season: buildSeasonSummary(weeklyRankedWithDelta, base.allActivityByUser, base.totalMembers),
    }
  }

  return {
    entries,
    sort,
    period,
    season: null,
  }
}

async function queryLeaderboard(sort: string, period: string): Promise<LeaderboardEntry[]> {
  const view = await queryLeaderboardView(sort, period)
  return view.entries
}

export const getLeaderboardView = unstable_cache(
  queryLeaderboardView,
  ['leaderboard-view'],
  { revalidate: 300, tags: ['leaderboard'] },
)

export const getLeaderboardData = unstable_cache(
  queryLeaderboard,
  ['leaderboard'],
  { revalidate: 300, tags: ['leaderboard'] },
)
