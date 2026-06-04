import { supabaseAdmin } from './db.ts'
import { getInstanceMembership } from './instance-membership.ts'
import { getUserUsageBreakdown } from './usage-breakdown.ts'
import { isMissingUsageBreakdownError } from './usage-breakdown-errors.ts'
import {
  buildUserProfileDetailPayload,
  type UserProfileActivityDay,
  type UserProfileDetail,
  type UserProfileStatsRow,
  type UserProfileStreakDay,
} from './user-profile-shared.ts'

export {
  buildUserProfileDetailPayload,
  sortUserProfileModels,
  type UserProfileActivityDay,
  type UserProfileDetail,
  type UserProfileModelEntry,
  type UserProfileStatsRow,
  type UserProfileStreakDay,
} from './user-profile-shared.ts'

function getRecentActivitySince(days: number) {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))
  return since.toISOString().slice(0, 10)
}

export async function getUserProfileDetail(userId: string): Promise<UserProfileDetail | null> {
  const membership = await getInstanceMembership(userId)
  if (!membership?.is_active) {
    return null
  }

  const since = getRecentActivitySince(365)
  const [{ data: stats, error: statsError }, { data: activity, error: activityError }, { data: streakDays, error: streakError }, usageBreakdownResult] = await Promise.all([
    supabaseAdmin
      .from('user_stats')
      .select('models_used, longest_streak, total_sessions')
      .eq('user_id', userId)
      .single<UserProfileStatsRow>(),
    supabaseAdmin
      .from('daily_activity')
      .select('date, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true })
      .returns<UserProfileActivityDay[]>(),
    supabaseAdmin
      .from('daily_activity')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .returns<UserProfileStreakDay[]>(),
    getUserUsageBreakdown(userId).then(
      (usageBreakdown) => ({ usageBreakdown }),
      (error) => {
        if (isMissingUsageBreakdownError(error)) {
          return { usageBreakdown: null }
        }

        throw error
      },
    ),
  ])

  if (statsError) {
    if (statsError.code === 'PGRST116') {
      return null
    }

    throw new Error(statsError.message)
  }

  if (activityError) {
    throw new Error(activityError.message)
  }

  if (streakError) {
    throw new Error(streakError.message)
  }

  return buildUserProfileDetailPayload({
    activity,
    stats,
    streakDays,
    usageBreakdown: usageBreakdownResult.usageBreakdown,
  })
}
