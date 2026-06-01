import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStreaks, totalTokens } from '../lib/leaderboard-math.ts'

test('computeStreaks returns zeroes when there is no activity', () => {
  assert.deepEqual(
    computeStreaks([], new Date('2026-06-01T10:00:00Z')),
    { current: 0, longest: 0 },
  )
})

test('computeStreaks deduplicates days and computes current plus longest streaks', () => {
  const result = computeStreaks(
    [
      '2026-05-28',
      '2026-05-29',
      '2026-05-29',
      '2026-05-30',
      '2026-06-01',
    ],
    new Date('2026-06-01T12:00:00Z'),
  )

  assert.deepEqual(result, { current: 1, longest: 3 })
})

test('computeStreaks keeps a streak alive when the last activity was yesterday', () => {
  const result = computeStreaks(
    ['2026-05-29', '2026-05-30', '2026-05-31'],
    new Date('2026-06-01T12:00:00Z'),
  )

  assert.deepEqual(result, { current: 3, longest: 3 })
})

test('computeStreaks drops the current streak after a missed day', () => {
  const result = computeStreaks(
    ['2026-05-27', '2026-05-28', '2026-05-29'],
    new Date('2026-06-01T12:00:00Z'),
  )

  assert.deepEqual(result, { current: 0, longest: 3 })
})

test('totalTokens sums every token source used for leaderboard scoring', () => {
  assert.equal(
    totalTokens({
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: 5,
      cache_read_input_tokens: 15,
    }),
    50,
  )
})
