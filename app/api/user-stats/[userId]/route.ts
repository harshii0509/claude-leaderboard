import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const { data, error } = await supabaseAdmin
    .from('user_stats')
    .select('models_used, current_streak, longest_streak, total_sessions')
    .eq('user_id', userId)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
