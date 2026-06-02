import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { ensureInstanceMembership, performInstanceMemberAction } from '@/lib/instance-membership'
import { canAccessAdmin } from '@/lib/membership-rules'

interface AdminMemberActionPayload {
  action?: string
  targetUserId?: string
}

function isActionPayload(value: unknown): value is AdminMemberActionPayload {
  return !!value && typeof value === 'object'
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await ensureInstanceMembership(session.user.id)
  if (!canAccessAdmin(membership.role, membership.is_active)) {
    return Response.json({ error: 'Admin access required' }, { status: 403 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isActionPayload(payload) || typeof payload.action !== 'string' || typeof payload.targetUserId !== 'string') {
    return Response.json({ error: 'Invalid member action payload' }, { status: 400 })
  }

  try {
    if (payload.action === 'promote' || payload.action === 'demote' || payload.action === 'transfer_ownership' || payload.action === 'deactivate' || payload.action === 'reactivate' || payload.action === 'hard_delete') {
      await performInstanceMemberAction(session.user.id, {
        action: payload.action,
        targetUserId: payload.targetUserId,
      })
    } else {
      return Response.json({ error: 'Unknown member action' }, { status: 400 })
    }

    revalidateTag('leaderboard', 'max')
    revalidateTag(`user-stats:${payload.targetUserId}`, 'max')
    revalidateTag(`activity:${payload.targetUserId}`, 'max')

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status =
      message.includes('required') || message.includes('cannot') || message.includes('Inactive') || message.includes('inactive')
        ? 403
        : message.includes('not found') || message.includes('Invalid')
          ? 400
          : 500

    return Response.json({ error: message }, { status })
  }
}
