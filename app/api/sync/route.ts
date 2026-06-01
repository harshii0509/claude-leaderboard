import { NextRequest } from 'next/server'
import { getUserIdForSyncToken } from '@/lib/sync-auth'
import { syncUserStats, validateSyncPayload } from '@/lib/sync'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return Response.json({ error: 'Missing Bearer token' }, { status: 401 })
  }

  let userId: string | null = null
  try {
    userId = await getUserIdForSyncToken(token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }

  if (!userId) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const validated = validateSyncPayload(payload)
    const result = await syncUserStats(userId, validated)
    return Response.json({
      ok: true,
      inserted_events: result.insertedEvents,
      sync_generation: result.syncGeneration,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.startsWith('Invalid ') || message.startsWith('Unsupported ') || message.startsWith('Too many ')
      ? 400
      : 500
    return Response.json({ error: message }, { status })
  }
}
