import { supabaseAdmin } from './db'
import { computeStreaks } from './leaderboard-math'
import type { ProfileShareCardData } from './profile-share-types'
import {
  buildShareCaption,
  buildShareFilename,
  formatCompactNumber,
  getSyncLabel,
  getTopModelLabel,
} from './profile-share-utils'

interface UserStatsRow {
  total_input_tokens: number | null
  total_output_tokens: number | null
  total_cache_creation_input_tokens: number | null
  total_cache_read_input_tokens: number | null
  total_messages: number | null
  total_sessions: number | null
  models_used: Record<string, number> | null
  last_synced_at: string | null
}

interface ActivityDateRow {
  date: string
}

function totalTokensFromStats(stats: UserStatsRow | null) {
  if (!stats) return 0

  return (
    (stats.total_input_tokens ?? 0) +
    (stats.total_output_tokens ?? 0) +
    (stats.total_cache_creation_input_tokens ?? 0) +
    (stats.total_cache_read_input_tokens ?? 0)
  )
}

export async function getProfileShareCardData(userId: string, displayName: string, avatarUrl: string | null): Promise<ProfileShareCardData> {
  const [{ data: stats }, { data: activity }] = await Promise.all([
    supabaseAdmin
      .from('user_stats')
      .select('total_input_tokens,total_output_tokens,total_cache_creation_input_tokens,total_cache_read_input_tokens,total_messages,total_sessions,models_used,last_synced_at')
      .eq('user_id', userId)
      .maybeSingle<UserStatsRow>(),
    supabaseAdmin
      .from('daily_activity')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .returns<ActivityDateRow[]>(),
  ])

  const streaks = computeStreaks((activity ?? []).map((row) => row.date))

  const baseData = {
    displayName,
    avatarUrl,
    totalTokens: totalTokensFromStats(stats ?? null),
    totalMessages: stats?.total_messages ?? 0,
    totalSessions: stats?.total_sessions ?? 0,
    currentStreak: streaks.current,
    topModel: getTopModelLabel(stats?.models_used),
    syncLabel: getSyncLabel(stats?.last_synced_at ?? null),
  }

  return {
    ...baseData,
    caption: buildShareCaption(baseData),
  }
}

export async function fetchImageAsDataUrl(src: string | null) {
  if (!src) return null

  try {
    const response = await fetch(src)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? 'image/png'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}

export {
  buildShareCaption,
  buildShareFilename,
  formatCompactNumber,
  getSyncLabel,
  getTopModelLabel,
}
