import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from './db'
import { LeaderboardEntry } from '@/components/Podium'

async function queryLeaderboard(sort: string, period: string): Promise<LeaderboardEntry[]> {
  const { data: stats, error } = await supabaseAdmin
    .from('user_stats')
    .select('user_id,total_input_tokens,total_output_tokens,total_cache_creation_input_tokens,total_cache_read_input_tokens,total_messages,total_sessions,current_streak,longest_streak,models_used,last_synced_at')

  if (error) throw new Error(error.message)

  const userIds = (stats ?? []).map((r: any) => r.user_id)
  const usersMap: Record<string, { name: string | null; image: string | null }> = {}
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .schema('next_auth')
      .from('users')
      .select('id,name,image')
      .in('id', userIds)
    for (const u of users ?? []) {
      usersMap[u.id] = { name: u.name, image: u.image }
    }
  }

  let rows = (stats ?? []).map((row: any) => {
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
      current_streak: row.current_streak ?? 0,
      longest_streak: row.longest_streak ?? 0,
      models_used: row.models_used ?? {},
      last_synced_at: row.last_synced_at,
    }
  })

  if (period !== 'all') {
    const days = period === '7d' ? 7 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)

    const { data: activity } = await supabaseAdmin
      .from('daily_activity')
      .select('user_id, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
      .gte('date', sinceStr)

    const actMap: Record<string, { input: number; output: number; cacheCreation: number; cacheRead: number; messages: number; sessions: number }> = {}
    for (const a of activity ?? []) {
      if (!actMap[a.user_id]) actMap[a.user_id] = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, messages: 0, sessions: 0 }
      actMap[a.user_id].input += a.input_tokens ?? 0
      actMap[a.user_id].output += a.output_tokens ?? 0
      actMap[a.user_id].cacheCreation += a.cache_creation_input_tokens ?? 0
      actMap[a.user_id].cacheRead += a.cache_read_input_tokens ?? 0
      actMap[a.user_id].messages += a.messages ?? 0
      actMap[a.user_id].sessions += a.sessions ?? 0
    }

    rows = rows.map((r) => {
      const a = actMap[r.user_id] ?? { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, messages: 0, sessions: 0 }
      return {
        ...r,
        total_input_tokens: a.input,
        total_output_tokens: a.output,
        total_cache_creation_input_tokens: a.cacheCreation,
        total_cache_read_input_tokens: a.cacheRead,
        total_tokens: a.input + a.output + a.cacheCreation + a.cacheRead,
        total_messages: a.messages,
        total_sessions: a.sessions,
      }
    })
  }

  if (sort === 'messages') {
    rows.sort((a, b) => b.total_messages - a.total_messages)
  } else if (sort === 'streak') {
    rows.sort((a, b) => b.current_streak - a.current_streak)
  } else {
    rows.sort((a, b) => b.total_tokens - a.total_tokens)
  }

  return rows
}

export const getLeaderboardData = unstable_cache(
  queryLeaderboard,
  ['leaderboard'],
  { revalidate: 60, tags: ['leaderboard'] }
)
