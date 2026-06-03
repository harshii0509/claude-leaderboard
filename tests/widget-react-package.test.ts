import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPublicWidgetDataUrl } from '../packages/widget-react/src/fetchPublicWidgetData.ts'

test('buildPublicWidgetDataUrl trims trailing slashes and encodes the public id', () => {
  const url = buildPublicWidgetDataUrl('https://leaderboard.example.com/', 'abc 123')
  assert.equal(url, 'https://leaderboard.example.com/api/public-widget/abc%20123')
})
