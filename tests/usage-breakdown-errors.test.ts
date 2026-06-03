import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isMissingUsageBreakdownError,
  USAGE_BREAKDOWN_UNAVAILABLE_MESSAGE,
} from '../lib/usage-breakdown-errors.ts'

test('detects missing get_user_usage_breakdown rpc errors', () => {
  assert.equal(
    isMissingUsageBreakdownError(
      new Error(
        'usage breakdown lookup failed: Could not find the function public.get_user_usage_breakdown(p_user_id) in the schema cache',
      ),
    ),
    true,
  )
})

test('detects missing raw usage events relation errors', () => {
  assert.equal(
    isMissingUsageBreakdownError(
      new Error('usage breakdown lookup failed: relation "leaderboard_private.raw_usage_events" does not exist'),
    ),
    true,
  )
})

test('ignores unrelated usage breakdown errors', () => {
  assert.equal(
    isMissingUsageBreakdownError(
      new Error('usage breakdown lookup failed: permission denied for function get_user_usage_breakdown'),
    ),
    false,
  )
})

test('returns a stable operator-facing unavailable message', () => {
  assert.match(USAGE_BREAKDOWN_UNAVAILABLE_MESSAGE, /temporarily unavailable/i)
  assert.match(USAGE_BREAKDOWN_UNAVAILABLE_MESSAGE, /migration/i)
})
