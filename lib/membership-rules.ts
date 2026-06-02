export type InstanceRole = 'owner' | 'admin' | 'member'

export type MembershipMutation =
  | 'transfer_ownership'
  | 'change_role'
  | 'deactivate'
  | 'reactivate'
  | 'hard_delete'

export interface MembershipActionInput {
  actorId: string
  actorRole: InstanceRole
  actorIsActive: boolean
  targetId: string
  targetRole: InstanceRole
  targetIsActive: boolean
  action: MembershipMutation
}

export function getInitialMembershipRole(existingMembershipCount: number): InstanceRole {
  return existingMembershipCount === 0 ? 'owner' : 'member'
}

export function canAccessAdmin(role: InstanceRole | null, isActive: boolean): boolean {
  return isActive && (role === 'owner' || role === 'admin')
}

export function canUseSyncFeatures(isActive: boolean): boolean {
  return isActive
}

export function canSelfDelete(role: InstanceRole): boolean {
  return role === 'member'
}

export function evaluateMembershipAction({
  actorId,
  actorRole,
  actorIsActive,
  targetId,
  targetRole,
  targetIsActive,
  action,
}: MembershipActionInput): { allowed: boolean; reason: string | null } {
  if (!actorIsActive) return { allowed: false, reason: 'inactive_actor' }

  if (actorRole === 'member') {
    return { allowed: false, reason: 'admin_access_required' }
  }

  if (actorId === targetId) {
    return { allowed: false, reason: 'cannot_manage_self' }
  }

  if (action === 'transfer_ownership') {
    if (actorRole !== 'owner') return { allowed: false, reason: 'owner_access_required' }
    if (!targetIsActive) return { allowed: false, reason: 'target_inactive' }
    return { allowed: true, reason: null }
  }

  if (targetRole === 'owner') {
    return { allowed: false, reason: 'cannot_modify_owner' }
  }

  if (actorRole === 'admin' && targetRole !== 'member') {
    return { allowed: false, reason: 'admins_manage_members_only' }
  }

  if (action === 'change_role') {
    if (actorRole !== 'owner') return { allowed: false, reason: 'owner_access_required' }
    if (!targetIsActive) return { allowed: false, reason: 'target_inactive' }
    return { allowed: true, reason: null }
  }

  if (action === 'reactivate') {
    return { allowed: true, reason: null }
  }

  if (action === 'deactivate' || action === 'hard_delete') {
    return { allowed: true, reason: null }
  }

  return { allowed: false, reason: 'unknown_action' }
}
