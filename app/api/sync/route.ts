import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { syncUserStats, SyncPayload } from '@/lib/sync'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return Response.json({ error: 'Missing Bearer token' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_stats')
    .select('user_id')
    .eq('sync_token', token)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  let payload: SyncPayload
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    await syncUserStats(data.user_id, payload)
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
