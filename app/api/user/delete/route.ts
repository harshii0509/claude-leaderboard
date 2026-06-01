import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin.rpc('delete_account', {
    p_user_id: session.user.id,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
