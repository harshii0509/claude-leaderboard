const USAGE_BREAKDOWN_ERROR_MARKERS = [
  'Could not find the function public.get_user_usage_breakdown',
  'function public.get_user_usage_breakdown(uuid) does not exist',
  'function get_user_usage_breakdown(uuid) does not exist',
  'relation "leaderboard_private.raw_usage_events" does not exist',
  'relation "public.instance_memberships" does not exist',
]

export const USAGE_BREAKDOWN_UNAVAILABLE_MESSAGE =
  'Usage breakdown is temporarily unavailable because the latest database migration has not been applied yet. Run the latest Supabase migrations to restore per-source and per-model usage details.'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return ''
}

export function isMissingUsageBreakdownError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return USAGE_BREAKDOWN_ERROR_MARKERS.some((marker) => message.includes(marker))
}
