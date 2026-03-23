import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const since = new Date()
  since.setDate(since.getDate() - 90)

  const { data, error } = await supabaseAdmin
    .from('daily_activity')
    .select('date, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
    .eq('user_id', userId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}
