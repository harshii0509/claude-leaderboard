import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUsageBreakdown,
  deriveUsageProvider,
  getUsageModelLabel,
  getUsageProviderLabel,
  getUsageSourceLabel,
} from '../lib/usage-breakdown.ts'

test('deriveUsageProvider prefers normalized model prefixes and falls back by source', () => {
  assert.equal(deriveUsageProvider('opencode', 'anthropic/claude-sonnet-4'), 'anthropic')
  assert.equal(deriveUsageProvider('claude', 'claude-opus-4'), 'anthropic')
  assert.equal(deriveUsageProvider('codex', 'gpt-5.4-mini'), 'openai')
  assert.equal(deriveUsageProvider('opencode', 'gpt-5'), 'unknown')
})

test('label helpers keep source and provider names readable', () => {
  assert.equal(getUsageSourceLabel('claude'), 'Claude')
  assert.equal(getUsageSourceLabel('opencode'), 'OpenCode')
  assert.equal(getUsageProviderLabel('openai'), 'OpenAI')
  assert.equal(getUsageProviderLabel('unknown'), 'Unknown')
  assert.equal(getUsageModelLabel('anthropic/claude-sonnet-4-20250514'), 'sonnet-4')
  assert.equal(getUsageModelLabel('gpt-5.4-mini'), 'gpt-5.4-mini')
})

test('buildUsageBreakdown groups rows by source, provider, and model while preserving aggregate totals', () => {
  const result = buildUsageBreakdown([
    {
      source: 'codex',
      model: 'gpt-5.4-mini',
      input_tokens: 60,
      output_tokens: 25,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 15,
      sessions: 1,
      events: 1,
      source_total_sessions: 1,
      source_total_events: 1,
    },
    {
      source: 'claude',
      model: 'claude-opus-4',
      input_tokens: 120,
      output_tokens: 45,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 30,
      sessions: 2,
      events: 2,
      source_total_sessions: 3,
      source_total_events: 3,
    },
    {
      source: 'claude',
      model: 'claude-sonnet-4',
      input_tokens: 90,
      output_tokens: 20,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 5,
      sessions: 1,
      events: 1,
      source_total_sessions: 3,
      source_total_events: 3,
    },
    {
      source: 'opencode',
      model: 'anthropic/claude-sonnet-4',
      input_tokens: 80,
      output_tokens: 35,
      cache_creation_input_tokens: 4,
      cache_read_input_tokens: 11,
      sessions: 1,
      events: 1,
      source_total_sessions: 1,
      source_total_events: 1,
    },
  ])

  assert.equal(result.sources.length, 3)
  assert.deepEqual(
    result.sources.map((source) => source.source),
    ['claude', 'codex', 'opencode'],
  )

  assert.deepEqual(result.sources[0], {
    source: 'claude',
    total_tokens: 320,
    total_sessions: 3,
    total_events: 3,
    providers: [
      {
        provider: 'anthropic',
        total_tokens: 320,
        models: [
          {
            model: 'claude-opus-4',
            input_tokens: 120,
            output_tokens: 45,
            cache_creation_input_tokens: 10,
            cache_read_input_tokens: 30,
            total_tokens: 205,
            sessions: 2,
            events: 2,
          },
          {
            model: 'claude-sonnet-4',
            input_tokens: 90,
            output_tokens: 20,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 5,
            total_tokens: 115,
            sessions: 1,
            events: 1,
          },
        ],
      },
    ],
  })

  assert.deepEqual(result.sources[1], {
    source: 'codex',
    total_tokens: 100,
    total_sessions: 1,
    total_events: 1,
    providers: [
      {
        provider: 'openai',
        total_tokens: 100,
        models: [
          {
            model: 'gpt-5.4-mini',
            input_tokens: 60,
            output_tokens: 25,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 15,
            total_tokens: 100,
            sessions: 1,
            events: 1,
          },
        ],
      },
    ],
  })

  assert.deepEqual(result.sources[2], {
    source: 'opencode',
    total_tokens: 130,
    total_sessions: 1,
    total_events: 1,
    providers: [
      {
        provider: 'anthropic',
        total_tokens: 130,
        models: [
          {
            model: 'anthropic/claude-sonnet-4',
            input_tokens: 80,
            output_tokens: 35,
            cache_creation_input_tokens: 4,
            cache_read_input_tokens: 11,
            total_tokens: 130,
            sessions: 1,
            events: 1,
          },
        ],
      },
    ],
  })
})
