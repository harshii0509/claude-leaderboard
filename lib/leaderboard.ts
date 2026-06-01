import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from './db'
import { computeStreaks, totalTokens, type ActivityRow } from './leaderboard-math'
import { LeaderboardEntry } from '@/components/Podium'

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

function mapStatRow(row: UserStatRow, usersMap: Record<string, { name: string | null; image: string | null }>): LeaderboardEntry {
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
  }
}

async function queryLeaderboard(sort: string, period: string): Promise<LeaderboardEntry[]> {
  const { data: stats, error } = await supabaseAdmin
    .from('user_stats')
    .select('user_id,total_input_tokens,total_output_tokens,total_cache_creation_input_tokens,total_cache_read_input_tokens,total_messages,total_sessions,longest_streak,models_used,last_synced_at')

  if (error) throw new Error(error.message)

  const typedStats = (stats ?? []) as UserStatRow[]
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

  const { data: activity, error: activityError } = await supabaseAdmin
    .from('daily_activity')
    .select('user_id,date,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,messages,sessions')

  if (activityError) throw new Error(activityError.message)

  const allActivityByUser = new Map<string, ActivityDbRow[]>()
  for (const row of (activity ?? []) as ActivityDbRow[]) {
    const existing = allActivityByUser.get(row.user_id)
    if (existing) existing.push(row)
    else allActivityByUser.set(row.user_id, [row])
  }

  let rows = typedStats.map((row) => {
    const entry = mapStatRow(row, usersMap)
    const streaks = computeStreaks((allActivityByUser.get(entry.user_id) ?? []).map((activityRow) => activityRow.date))

    return {
      ...entry,
      current_streak: streaks.current,
    }
  })

  if (period !== 'all') {
    const days = period === '7d' ? 7 : 30
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))
    const sinceStr = since.toISOString().slice(0, 10)

    rows = rows.map((entry) => {
      const activityRows = (allActivityByUser.get(entry.user_id) ?? []).filter((row) => row.date >= sinceStr)
      const streaks = computeStreaks(activityRows.map((row) => row.date))

      return {
        ...entry,
        total_input_tokens: activityRows.reduce((sum, row) => sum + row.input_tokens, 0),
        total_output_tokens: activityRows.reduce((sum, row) => sum + row.output_tokens, 0),
        total_cache_creation_input_tokens: activityRows.reduce((sum, row) => sum + row.cache_creation_input_tokens, 0),
        total_cache_read_input_tokens: activityRows.reduce((sum, row) => sum + row.cache_read_input_tokens, 0),
        total_tokens: activityRows.reduce((sum, row) => sum + totalTokens(row), 0),
        total_messages: activityRows.reduce((sum, row) => sum + row.messages, 0),
        total_sessions: activityRows.reduce((sum, row) => sum + row.sessions, 0),
        current_streak: streaks.current,
        longest_streak: streaks.longest,
      }
    })
  }

  rows.sort((a, b) => {
    if (sort === 'messages') {
      return b.total_messages - a.total_messages || b.total_tokens - a.total_tokens
    }
    if (sort === 'streak') {
      return b.current_streak - a.current_streak || b.total_tokens - a.total_tokens
    }
    return b.total_tokens - a.total_tokens || b.total_messages - a.total_messages
  })

  return rows
}

export const getLeaderboardData = unstable_cache(
  queryLeaderboard,
  ['leaderboard'],
  { revalidate: 300, tags: ['leaderboard'] }
)
