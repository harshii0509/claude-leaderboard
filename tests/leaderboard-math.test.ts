import test from 'node:test'
import assert from 'node:assert/strict'
import { computeStreaks, computeWeeklyScore, dateKey, daysUntilNextWeek, seasonWindow, startOfWeek, totalTokens } from '../lib/leaderboard-math.ts'

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

test('startOfWeek anchors seasons to Monday and seasonWindow spans through Sunday', () => {
  const monday = startOfWeek(new Date('2026-06-03T12:00:00'))
  assert.equal(dateKey(monday), '2026-06-01')

  assert.deepEqual(
    seasonWindow(new Date('2026-06-03T12:00:00')),
    { start: '2026-06-01', end: '2026-06-07' },
  )
})

test('daysUntilNextWeek rounds up remaining season time', () => {
  assert.equal(daysUntilNextWeek(new Date('2026-06-03T12:00:00')), 5)
  assert.equal(daysUntilNextWeek(new Date('2026-06-07T23:00:00')), 1)
})

test('computeWeeklyScore favors steady multi-day usage over one giant spike', () => {
  const oneHugeDay = computeWeeklyScore([
    {
      date: '2026-06-02',
      input_tokens: 55_000,
      output_tokens: 25_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      messages: 20,
      sessions: 12,
    },
  ])

  const steadyWeek = computeWeeklyScore([
    {
      date: '2026-06-01',
      input_tokens: 1_200,
      output_tokens: 800,
      cache_creation_input_tokens: 50,
      cache_read_input_tokens: 100,
      messages: 4,
      sessions: 2,
    },
    {
      date: '2026-06-02',
      input_tokens: 1_100,
      output_tokens: 700,
      cache_creation_input_tokens: 25,
      cache_read_input_tokens: 125,
      messages: 3,
      sessions: 2,
    },
    {
      date: '2026-06-03',
      input_tokens: 1_250,
      output_tokens: 850,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 130,
      messages: 4,
      sessions: 2,
    },
    {
      date: '2026-06-04',
      input_tokens: 1_300,
      output_tokens: 900,
      cache_creation_input_tokens: 15,
      cache_read_input_tokens: 110,
      messages: 5,
      sessions: 2,
    },
  ])

  assert.ok(steadyWeek.score > oneHugeDay.score)
  assert.equal(steadyWeek.activeDays, 4)
})
