import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSyncPayload } from '../lib/sync-payload.ts'

function buildPayload(overrides: Record<string, unknown> = {}) {
  const event = {
    event_id: 'evt-1',
    message_id: 'msg-1',
    session_id: 'session-1',
    event_timestamp: '2026-06-01T09:30:00.000Z',
    activity_date: '2026-06-01',
    model: 'claude-sonnet-4',
    input_tokens: 10,
    output_tokens: 12,
    cache_creation_input_tokens: 2,
    cache_read_input_tokens: 3,
    stop_reason: 'end_turn',
    source_path: '/tmp/usage.jsonl',
    source: 'claude',
  }

  return {
    client: {
      script_version: '2.1.0',
      schema_version: 2,
      hostname: 'devbox',
    },
    events: [event],
    ...overrides,
  }
}

test('validateSyncPayload normalizes timestamps and preserves valid events', () => {
  const payload = buildPayload({
    events: [
      {
        event_id: 'evt-1',
        message_id: 'msg-1',
        session_id: 'session-1',
        event_timestamp: '2026-06-01T15:00:00+05:30',
        activity_date: '2026-06-01',
        model: 'claude-sonnet-4',
        input_tokens: 10,
        output_tokens: 12,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        stop_reason: 'end_turn',
        source_path: '/tmp/usage.jsonl',
        source: 'claude',
      },
    ],
  })

  const result = validateSyncPayload(payload)
  assert.equal(result.events[0]?.event_timestamp, '2026-06-01T09:30:00.000Z')
  assert.equal(result.client.schema_version, 2)
})

test('validateSyncPayload dedupes repeated event ids by keeping the last event', () => {
  const payload = buildPayload({
    events: [
      {
        event_id: 'evt-1',
        message_id: 'msg-1',
        session_id: 'session-1',
        event_timestamp: '2026-06-01T09:30:00.000Z',
        activity_date: '2026-06-01',
        model: 'claude-sonnet-4',
        input_tokens: 10,
        output_tokens: 12,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        stop_reason: 'end_turn',
        source_path: '/tmp/usage.jsonl',
        source: 'claude',
      },
      {
        event_id: 'evt-1',
        message_id: 'msg-1b',
        session_id: 'session-1',
        event_timestamp: '2026-06-01T09:31:00.000Z',
        activity_date: '2026-06-01',
        model: 'claude-opus-4',
        input_tokens: 15,
        output_tokens: 16,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 1,
        stop_reason: 'end_turn',
        source_path: '/tmp/usage-2.jsonl',
        source: 'codex',
      },
    ],
  })

  const result = validateSyncPayload(payload)
  assert.equal(result.events.length, 1)
  assert.equal(result.events[0]?.model, 'claude-opus-4')
  assert.equal(result.events[0]?.source, 'codex')
})

test('validateSyncPayload rejects invalid activity dates', () => {
  assert.throws(
    () =>
      validateSyncPayload(
        buildPayload({
          events: [
            {
              event_id: 'evt-1',
              message_id: 'msg-1',
              session_id: 'session-1',
              event_timestamp: '2026-06-01T09:30:00.000Z',
              activity_date: '2026-13-99',
              model: 'claude-sonnet-4',
              input_tokens: 10,
              output_tokens: 12,
              cache_creation_input_tokens: 2,
              cache_read_input_tokens: 3,
              stop_reason: 'end_turn',
              source_path: '/tmp/usage.jsonl',
              source: 'claude',
            },
          ],
        }),
      ),
    /Invalid activity_date/,
  )
})

test('validateSyncPayload rejects negative token counts', () => {
  assert.throws(
    () =>
      validateSyncPayload(
        buildPayload({
          events: [
            {
              event_id: 'evt-1',
              message_id: 'msg-1',
              session_id: 'session-1',
              event_timestamp: '2026-06-01T09:30:00.000Z',
              activity_date: '2026-06-01',
              model: 'claude-sonnet-4',
              input_tokens: -1,
              output_tokens: 12,
              cache_creation_input_tokens: 2,
              cache_read_input_tokens: 3,
              stop_reason: 'end_turn',
              source_path: '/tmp/usage.jsonl',
              source: 'claude',
            },
          ],
        }),
      ),
    /Invalid input_tokens/,
  )
})

test('validateSyncPayload defaults source to claude when missing', () => {
  const payload = buildPayload({
    events: [
      {
        event_id: 'evt-1',
        message_id: 'msg-1',
        session_id: 'session-1',
        event_timestamp: '2026-06-01T09:30:00.000Z',
        activity_date: '2026-06-01',
        model: 'claude-sonnet-4',
        input_tokens: 10,
        output_tokens: 12,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 3,
        stop_reason: 'end_turn',
        source_path: '/tmp/usage.jsonl',
      },
    ],
  })

  const result = validateSyncPayload(payload)
  assert.equal(result.events[0]?.source, 'claude')
})

test('validateSyncPayload accepts opencode as a valid source', () => {
  const payload = buildPayload({
    events: [
      {
        event_id: 'evt-opencode-1',
        message_id: null,
        session_id: 'opencode-session-1',
        event_timestamp: '2026-06-02T09:30:00.000Z',
        activity_date: '2026-06-02',
        model: 'anthropic/claude-sonnet-4',
        input_tokens: 25,
        output_tokens: 14,
        cache_creation_input_tokens: 4,
        cache_read_input_tokens: 7,
        stop_reason: 'session_total',
        source_path: '/tmp/opencode.db',
        source: 'opencode',
      },
    ],
  })

  const result = validateSyncPayload(payload)
  assert.equal(result.events[0]?.source, 'opencode')
})
