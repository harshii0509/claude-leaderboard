import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { getInstanceMembership } from '@/lib/instance-membership'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  if (!isUuid(userId)) {
    return Response.json({ error: 'Invalid user id' }, { status: 400 })
  }

  const membership = await getInstanceMembership(userId)
  if (!membership?.is_active) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: exists, error: existsError } = await supabaseAdmin
    .from('user_stats')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existsError) {
    return Response.json({ error: existsError.message }, { status: 500 })
  }

  if (!exists) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const since = new Date()
  since.setDate(since.getDate() - 365)

  const { data, error } = await supabaseAdmin
    .from('daily_activity')
    .select('date, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
    .eq('user_id', userId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
