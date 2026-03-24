import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/db'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin.schema('next_auth').from('users').delete().eq('id', session.user.id)

  return Response.json({ ok: true })
}
