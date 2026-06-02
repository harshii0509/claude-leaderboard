export const INSTANCE_GOVERNANCE_UNAVAILABLE_MESSAGE =
  'Instance governance migration has not been applied yet. Run the latest Supabase migrations to enable ownership and member management.'

const GOVERNANCE_ERROR_MARKERS = [
  "Could not find the table 'public.instance_memberships' in the schema cache",
  'Could not find the function public.ensure_instance_membership',
  'Could not find the function public.get_instance_membership',
  'Could not find the function public.list_instance_memberships',
  'Could not find the function public.set_instance_member_role',
  'Could not find the function public.transfer_instance_ownership',
  'Could not find the function public.set_instance_member_active',
  'relation "public.instance_memberships" does not exist',
]

export function getErrorMessage(error: unknown): string {
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

export function isMissingInstanceGovernanceError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return GOVERNANCE_ERROR_MARKERS.some((marker) => message.includes(marker))
}
