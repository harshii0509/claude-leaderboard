import { revalidateTag } from 'next/cache'
import { supabaseAdmin } from './db'
import type { SyncPayload } from './sync-payload'
export { validateSyncPayload } from './sync-payload'

interface IngestResult {
  inserted_events: number
  sync_generation: number
}

export async function syncUserStats(userId: string, payload: SyncPayload) {
  if (payload.client.schema_version !== 2) {
    throw new Error(`Unsupported sync schema version: ${payload.client.schema_version}`)
  }

  const rows = payload.events.map((event) => ({
    event_id: event.event_id,
    message_id: event.message_id,
    session_id: event.session_id,
    event_timestamp: event.event_timestamp,
    activity_date: event.activity_date,
    model: event.model,
    input_tokens: event.input_tokens,
    output_tokens: event.output_tokens,
    cache_creation_input_tokens: event.cache_creation_input_tokens,
    cache_read_input_tokens: event.cache_read_input_tokens,
    stop_reason: event.stop_reason,
    source_path: event.source_path,
    source: event.source,
    script_version: payload.client.script_version,
    hostname: payload.client.hostname,
  }))

  const { data, error } = await supabaseAdmin.rpc('ingest_raw_usage_events', {
    p_user_id: userId,
    p_script_version: payload.client.script_version,
    p_hostname: payload.client.hostname,
    p_events: rows,
  })

  if (error) {
    throw new Error(`raw usage event ingest failed: ${error.message}`)
  }

  if (!data || typeof data !== 'object') {
    throw new Error('raw usage event ingest failed: missing ingest result')
  }

  const result = data as Partial<IngestResult>
  if (typeof result.inserted_events !== 'number') {
    throw new Error('raw usage event ingest failed: missing insert count')
  }

  if (typeof result.sync_generation !== 'number') {
    throw new Error('raw usage event ingest failed: missing sync generation')
  }

  revalidateTag('leaderboard', 'max')
  revalidateTag(`user-stats:${userId}`, 'max')
  revalidateTag(`activity:${userId}`, 'max')

  return {
    insertedEvents: result.inserted_events,
    syncGeneration: result.sync_generation,
  }
}
