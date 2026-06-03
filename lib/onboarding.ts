import { supabaseAdmin } from './db.ts'

interface UserStatsSummary {
  last_synced_at: string | null
  total_sessions: number | null
}

export function hasCompletedOnboarding(stats: UserStatsSummary | null): boolean {
  if (!stats) return false

  return Boolean(stats.last_synced_at) || (stats.total_sessions ?? 0) > 0
}

export async function isUserOnboardingEligible(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_stats')
    .select('last_synced_at,total_sessions')
    .eq('user_id', userId)
    .maybeSingle<UserStatsSummary>()

  if (error) {
    throw new Error(`onboarding lookup failed: ${error.message}`)
  }

  return !hasCompletedOnboarding(data ?? null)
}

export function getJoinFlowRedirectPath(onboardingEligible: boolean): string {
  return onboardingEligible ? '/welcome' : '/'
}

export function getHomeRedirectPath(options: {
  onboardingEligible: boolean
  isMobile: boolean
}): string | null {
  if (!options.onboardingEligible) return null
  if (options.isMobile) return null
  return '/setup'
}
