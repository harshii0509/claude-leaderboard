import { supabaseAdmin } from './db'
import type { InstanceRole } from './membership-rules'

export interface InstanceMembership {
  user_id: string
  role: InstanceRole
  is_active: boolean
  deactivated_at: string | null
}

export interface InstanceMemberSummary extends InstanceMembership {
  name: string | null
  email: string | null
  image: string | null
  created_at: string
  last_synced_at: string | null
  last_activity_date: string | null
}

export type InstanceMemberAction =
  | { action: 'promote'; targetUserId: string }
  | { action: 'demote'; targetUserId: string }
  | { action: 'transfer_ownership'; targetUserId: string }
  | { action: 'deactivate'; targetUserId: string }
  | { action: 'reactivate'; targetUserId: string }
  | { action: 'hard_delete'; targetUserId: string }

function normalizeMembership(value: Partial<InstanceMembership> | null): InstanceMembership | null {
  if (!value?.user_id) return null

  const role =
    value.role === 'owner' || value.role === 'admin' || value.role === 'member'
      ? value.role
      : 'member'

  return {
    user_id: value.user_id,
    role,
    is_active: value.is_active === true,
    deactivated_at: typeof value.deactivated_at === 'string' ? value.deactivated_at : null,
  }
}

export async function ensureInstanceMembership(userId: string): Promise<InstanceMembership> {
  const { data, error } = await supabaseAdmin.rpc('ensure_instance_membership', {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(`instance membership bootstrap failed: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  const membership = normalizeMembership(row as Partial<InstanceMembership> | null)

  if (!membership) {
    throw new Error('instance membership bootstrap failed: missing membership row')
  }

  return membership
}

export async function getInstanceMembership(userId: string): Promise<InstanceMembership | null> {
  const { data, error } = await supabaseAdmin.rpc('get_instance_membership', {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(`instance membership lookup failed: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  return normalizeMembership(row as Partial<InstanceMembership> | null)
}

export async function listInstanceMembers(): Promise<InstanceMemberSummary[]> {
  const { data, error } = await supabaseAdmin.rpc('list_instance_memberships')

  if (error) {
    throw new Error(`instance membership list failed: ${error.message}`)
  }

  return Array.isArray(data) ? (data as InstanceMemberSummary[]) : []
}

export async function performInstanceMemberAction(
  actorUserId: string,
  action: InstanceMemberAction,
): Promise<void> {
  if (action.action === 'promote' || action.action === 'demote') {
    const { error } = await supabaseAdmin.rpc('set_instance_member_role', {
      p_actor_user_id: actorUserId,
      p_target_user_id: action.targetUserId,
      p_role: action.action === 'promote' ? 'admin' : 'member',
    })

    if (error) throw new Error(error.message)
    return
  }

  if (action.action === 'transfer_ownership') {
    const { error } = await supabaseAdmin.rpc('transfer_instance_ownership', {
      p_actor_user_id: actorUserId,
      p_target_user_id: action.targetUserId,
    })

    if (error) throw new Error(error.message)
    return
  }

  if (action.action === 'deactivate' || action.action === 'reactivate') {
    const { error } = await supabaseAdmin.rpc('set_instance_member_active', {
      p_actor_user_id: actorUserId,
      p_target_user_id: action.targetUserId,
      p_is_active: action.action === 'reactivate',
    })

    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabaseAdmin.rpc('admin_delete_account', {
    p_actor_user_id: actorUserId,
    p_target_user_id: action.targetUserId,
  })

  if (error) throw new Error(error.message)
}
