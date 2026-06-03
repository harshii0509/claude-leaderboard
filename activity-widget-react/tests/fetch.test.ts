import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildActivityWidgetDataUrl,
  fetchActivityWidgetData,
} from '../dist/data/fetchActivityWidgetData.js'

const samplePayload = {
  publicId: 'demo',
  displayName: 'Demo User',
  image: null,
  preset: 'arcade',
  currentStreak: 4,
  totalActiveDays: 12,
  lastSyncedAt: '2026-06-04T10:00:00.000Z',
  activity: [],
}

test('buildActivityWidgetDataUrl trims trailing slashes and encodes the public id', () => {
  const url = buildActivityWidgetDataUrl('https://leaderboard.example.com/', 'abc 123')
  assert.equal(url, 'https://leaderboard.example.com/api/public-widget/abc%20123')
})

test('fetchActivityWidgetData parses successful payloads', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify(samplePayload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as typeof fetch

  try {
    const result = await fetchActivityWidgetData('https://leaderboard.example.com', 'demo')
    assert.equal(result.displayName, 'Demo User')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchActivityWidgetData surfaces json api errors', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Widget not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    }) as typeof fetch

  try {
    await assert.rejects(
      () => fetchActivityWidgetData('https://leaderboard.example.com', 'missing'),
      /Widget not found/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchActivityWidgetData surfaces malformed json cleanly', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response('{"broken"', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as typeof fetch

  try {
    await assert.rejects(
      () => fetchActivityWidgetData('https://leaderboard.example.com', 'broken'),
      /invalid JSON/i,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
