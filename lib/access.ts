import { redirect } from 'next/navigation'
import { auth } from './auth'
import { ensureInstanceMembership } from './instance-membership'
import { canAccessAdmin, canSelfDelete } from './membership-rules'

export async function requireActiveSession() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const membership = await ensureInstanceMembership(session.user.id)
  if (!membership.is_active) {
    redirect('/?error=MembershipInactive')
  }

  return { session, membership }
}

export async function requireAdminSession() {
  const result = await requireActiveSession()

  if (!canAccessAdmin(result.membership.role, result.membership.is_active)) {
    redirect('/?error=AdminRequired')
  }

  return result
}

export async function requireOwnerSession() {
  const result = await requireActiveSession()

  if (result.membership.role !== 'owner') {
    redirect('/?error=OwnerRequired')
  }

  return result
}

export async function canCurrentUserSelfDelete(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) return false

  const membership = await ensureInstanceMembership(session.user.id)
  return membership.is_active && canSelfDelete(membership.role)
}
