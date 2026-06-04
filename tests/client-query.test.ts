import test from 'node:test'
import assert from 'node:assert/strict'
import { clientQueryKeys } from '../lib/client-query.ts'

test('client query keys stay stable and intentionally shared', () => {
  assert.deepEqual(clientQueryKeys.leaderboard('tokens', 'all'), ['leaderboard', 'tokens', 'all'])
  assert.deepEqual(clientQueryKeys.userProfile('user-123'), ['user-profile', 'user-123'])
  assert.deepEqual(clientQueryKeys.widgetSettings(), ['widget-settings'])
})
