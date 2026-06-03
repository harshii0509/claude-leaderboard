const MAX_EVENTS_PER_REQUEST = 20_000
const ALLOWED_SOURCES = new Set(['claude', 'codex', 'opencode'])

export interface SyncEvent {
  event_id: string
  message_id: string | null
  session_id: string
  event_timestamp: string
  activity_date: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  stop_reason: string | null
  source_path: string | null
  source: 'claude' | 'codex' | 'opencode'
}

export interface SyncClientInfo {
  script_version: string
  hostname: string | null
  schema_version: number
}

export interface SyncPayload {
  client: SyncClientInfo
  events: SyncEvent[]
}

type SanitizedSyncEvent = SyncEvent

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`Invalid ${field}`)
  }
  return value
}

function asString(value: unknown, field: string, maxLength = 512): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${field}`)
  }
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`Invalid ${field}`)
  }
  return trimmed
}

function asOptionalString(value: unknown, field: string, maxLength = 512): string | null {
  if (value == null) return null
  return asString(value, field, maxLength)
}

function asSource(value: unknown): 'claude' | 'codex' | 'opencode' {
  if (value == null) {
    return 'claude'
  }

  const source = asString(value, 'source', 32)
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error('Invalid source')
  }

  return source as 'claude' | 'codex' | 'opencode'
}

function asIsoTimestamp(value: unknown, field: string): string {
  const timestamp = asString(value, field, 128)
  const time = Date.parse(timestamp)
  if (!Number.isFinite(time)) {
    throw new Error(`Invalid ${field}`)
  }
  return new Date(time).toISOString()
}

function asIsoDate(value: unknown, field: string): string {
  const date = asString(value, field, 32)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Invalid ${field}`)
  }
  return date
}

function sanitizeEvent(event: unknown): SanitizedSyncEvent {
  if (!isPlainObject(event)) {
    throw new Error('Invalid event')
  }

  return {
    event_id: asString(event.event_id, 'event_id'),
    message_id: asOptionalString(event.message_id, 'message_id'),
    session_id: asString(event.session_id, 'session_id'),
    event_timestamp: asIsoTimestamp(event.event_timestamp, 'event_timestamp'),
    activity_date: asIsoDate(event.activity_date, 'activity_date'),
    model: asString(event.model, 'model'),
    input_tokens: asNonNegativeInteger(event.input_tokens, 'input_tokens'),
    output_tokens: asNonNegativeInteger(event.output_tokens, 'output_tokens'),
    cache_creation_input_tokens: asNonNegativeInteger(event.cache_creation_input_tokens, 'cache_creation_input_tokens'),
    cache_read_input_tokens: asNonNegativeInteger(event.cache_read_input_tokens, 'cache_read_input_tokens'),
    stop_reason: asOptionalString(event.stop_reason, 'stop_reason'),
    source_path: asOptionalString(event.source_path, 'source_path'),
    source: asSource(event.source),
  }
}

export function validateSyncPayload(payload: unknown): SyncPayload {
  if (!isPlainObject(payload)) {
    throw new Error('Invalid sync payload')
  }

  if (!isPlainObject(payload.client)) {
    throw new Error('Invalid sync payload client')
  }

  const scriptVersion = asString(payload.client.script_version, 'script_version', 64)
  const schemaVersion = asNonNegativeInteger(payload.client.schema_version, 'schema_version')
  const hostname = asOptionalString(payload.client.hostname, 'hostname', 255)

  if (!Array.isArray(payload.events)) {
    throw new Error('Invalid sync payload events')
  }

  if (payload.events.length > MAX_EVENTS_PER_REQUEST) {
    throw new Error(`Too many events in one sync (max ${MAX_EVENTS_PER_REQUEST})`)
  }

  const deduped = new Map<string, SanitizedSyncEvent>()
  for (const rawEvent of payload.events) {
    const event = sanitizeEvent(rawEvent)
    deduped.set(event.event_id, event)
  }

  return {
    client: {
      script_version: scriptVersion,
      schema_version: schemaVersion,
      hostname,
    },
    events: Array.from(deduped.values()),
  }
}
