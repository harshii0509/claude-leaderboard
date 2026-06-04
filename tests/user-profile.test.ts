import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUserProfileDetailPayload, sortUserProfileModels } from '../lib/user-profile-shared.ts'

test('buildUserProfileDetailPayload preserves activity and computes streak-oriented fields', () => {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const detail = buildUserProfileDetailPayload({
    activity: [
      {
        date: yesterdayStr,
        input_tokens: 10,
        output_tokens: 15,
        cache_creation_input_tokens: 2,
        cache_read_input_tokens: 5,
        messages: 1,
        sessions: 1,
      },
      {
        date: todayStr,
        input_tokens: 20,
        output_tokens: 25,
        cache_creation_input_tokens: 3,
        cache_read_input_tokens: 6,
        messages: 2,
        sessions: 1,
      },
    ],
    stats: {
      longest_streak: 5,
      models_used: { 'claude-opus-4': 2, 'claude-sonnet-4': 1 },
      total_sessions: 9,
    },
    streakDays: [{ date: yesterdayStr }, { date: todayStr }],
    usageBreakdown: null,
  })

  assert.equal(detail.activity.length, 2)
  assert.equal(detail.current_streak, 2)
  assert.equal(detail.longest_streak, 5)
  assert.equal(detail.total_sessions, 9)
  assert.deepEqual(detail.models_used, { 'claude-opus-4': 2, 'claude-sonnet-4': 1 })
  assert.equal(detail.usage_breakdown, null)
})

test('sortUserProfileModels orders model counts descending for fallback UI', () => {
  assert.deepEqual(
    sortUserProfileModels({
      'claude-sonnet-4': 3,
      'claude-opus-4': 8,
      'gpt-5': 1,
    }),
    [
      { model: 'claude-opus-4', count: 8 },
      { model: 'claude-sonnet-4', count: 3 },
      { model: 'gpt-5', count: 1 },
    ],
  )
})
