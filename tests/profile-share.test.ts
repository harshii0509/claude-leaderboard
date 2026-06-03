import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  buildShareCaption,
  buildShareFilename,
  formatCompactNumber,
  getSyncLabel,
  getTopModelLabel,
} from '../lib/profile-share-utils.ts'
import { parseShareResponse } from '../lib/profile-share-client.ts'

test('formatCompactNumber formats thousands and millions', () => {
  assert.equal(formatCompactNumber(950), '950')
  assert.equal(formatCompactNumber(1_500), '1.5k')
  assert.equal(formatCompactNumber(18_400), '18k')
  assert.equal(formatCompactNumber(1_250_000), '1.3M')
})

test('getTopModelLabel shortens common claude model names', () => {
  assert.equal(
    getTopModelLabel({
      'claude-sonnet-4-20250514': 12,
      'claude-opus-4-20250514': 2,
    }),
    'sonnet-4'
  )
  assert.equal(getTopModelLabel(null), null)
})

test('getSyncLabel handles missing and recent syncs', () => {
  assert.equal(getSyncLabel(null), 'Ready to start syncing')
  assert.equal(getSyncLabel(new Date().toISOString()), 'Synced today')
})

test('buildShareCaption stays deterministic and stats-led', () => {
  const caption = buildShareCaption({
    displayName: 'Harshii',
    avatarUrl: null,
    totalTokens: 24_320,
    totalMessages: 415,
    totalSessions: 28,
    currentStreak: 6,
    topModel: 'sonnet-4',
    syncLabel: 'Synced today',
  })

  assert.match(caption, /24k AI tokens/)
  assert.match(caption, /415 messages/)
  assert.match(caption, /Current streak: 6 days\./)
  assert.match(caption, /Top model lately: sonnet-4\./)
})

test('buildShareFilename produces a stable png filename', () => {
  assert.equal(buildShareFilename('Harshii Patel'), 'harshii-patel-share-card.png')
  assert.equal(buildShareFilename('!!!'), 'profile-share-card.png')
})

test('parseShareResponse returns JSON payloads for successful responses', async () => {
  const response = new Response(
    JSON.stringify({
      image: 'data:image/png;base64,abc',
      caption: 'hello',
      filename: 'hello.png',
      card: {
        displayName: 'Harshii',
        avatarUrl: null,
        totalTokens: 1,
        totalMessages: 2,
        totalSessions: 3,
        currentStreak: 4,
        topModel: 'sonnet-4',
        syncLabel: 'Synced today',
        caption: 'hello',
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  )

  const payload = await parseShareResponse(response)
  assert.equal(payload.filename, 'hello.png')
  assert.equal(payload.card.displayName, 'Harshii')
})

test('parseShareResponse surfaces JSON API errors cleanly', async () => {
  const response = new Response(JSON.stringify({ error: 'Boom' }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  })

  await assert.rejects(() => parseShareResponse(response), /Boom/)
})

test('parseShareResponse handles non-JSON error responses without a JSON parse crash', async () => {
  const response = new Response('Internal Server Error', {
    status: 500,
    headers: { 'content-type': 'text/plain' },
  })

  await assert.rejects(() => parseShareResponse(response), /Internal Server Error/)
})

test('ProfileShareCard source stays OG-safe by avoiding inline-flex styles', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../components/ProfileShareCard.tsx', import.meta.url)),
    'utf8'
  )
  assert.doesNotMatch(source, /inline-flex/)
})
