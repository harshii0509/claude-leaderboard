import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'
import { ensureInstanceMembership } from '@/lib/instance-membership'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await ensureInstanceMembership(session.user.id)
  if (!membership.is_active) {
    return Response.json({ error: 'User is inactive' }, { status: 403 })
  }

  const { error } = await supabaseAdmin.rpc('delete_account', {
    p_user_id: session.user.id,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
