import { computeStreaks } from './leaderboard-math.ts'
import type { UsageBreakdown } from './usage-breakdown-shared.ts'

export interface UserProfileActivityDay {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  messages: number
  sessions: number
}

export interface UserProfileModelEntry {
  model: string
  count: number
}

export interface UserProfileDetail {
  activity: UserProfileActivityDay[]
  current_streak: number
  longest_streak: number
  models_used: Record<string, number> | null
  total_sessions: number
  usage_breakdown: UsageBreakdown | null
}

export interface UserProfileStatsRow {
  longest_streak: number | null
  models_used: Record<string, number> | null
  total_sessions: number | null
}

export interface UserProfileStreakDay {
  date: string
}

export function buildUserProfileDetailPayload({
  activity,
  stats,
  streakDays,
  usageBreakdown,
}: {
  activity: UserProfileActivityDay[] | null | undefined
  stats: UserProfileStatsRow
  streakDays: UserProfileStreakDay[] | null | undefined
  usageBreakdown: UsageBreakdown | null
}): UserProfileDetail {
  const streaks = computeStreaks((streakDays ?? []).map((row) => row.date))

  return {
    activity: activity ?? [],
    current_streak: streaks.current,
    longest_streak: Math.max(stats.longest_streak ?? 0, streaks.longest),
    models_used: stats.models_used ?? null,
    total_sessions: stats.total_sessions ?? 0,
    usage_breakdown: usageBreakdown,
  }
}

export function sortUserProfileModels(
  modelsUsed: Record<string, number> | null | undefined,
): UserProfileModelEntry[] {
  return Object.entries(modelsUsed ?? {})
    .map(([model, count]) => ({ model, count: count as number }))
    .sort((a, b) => b.count - a.count)
}
