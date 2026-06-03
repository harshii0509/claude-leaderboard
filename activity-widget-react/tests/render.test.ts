import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActivityWidgetFromData } from '../dist/components/ActivityWidgetFromData.js'
import { getTooltipLines } from '../dist/data/widgetData.js'
import type { ActivityWidgetData } from '../dist/types.js'

const baseData: ActivityWidgetData = {
  publicId: 'demo-user',
  displayName: 'Extremely Long Display Name For Testing Widget Layout',
  image: null,
  preset: 'arcade',
  currentStreak: 0,
  totalActiveDays: 0,
  lastSyncedAt: null,
  activity: [],
}

test('ActivityWidgetFromData renders direct data mode with zero activity safely', () => {
  const html = renderToStaticMarkup(React.createElement(ActivityWidgetFromData, { data: baseData }))

  assert.match(html, /Personal activity/)
  assert.match(html, /Active days/)
  assert.match(html, /0d/)
})

test('ActivityWidgetFromData renders avatar fallback and keeps full long name accessible', () => {
  const html = renderToStaticMarkup(React.createElement(ActivityWidgetFromData, { data: baseData }))

  assert.match(html, /avatar fallback/)
  assert.match(html, /title="Extremely Long Display Name For Testing Widget Layout"/)
})

test('ActivityWidgetFromData stays white-label and does not force Claude Leaderboard branding', () => {
  const html = renderToStaticMarkup(
    React.createElement(ActivityWidgetFromData, {
      data: baseData,
      theme: {
        frame: '#101010',
        text: '#f5f5f5',
        muted: '#bdbdbd',
        chipBackground: '#1f1f1f',
        chipBorder: '#444444',
        tooltipBackground: '#000000',
        tooltipText: '#ffffff',
        avatarBackground: '#262626',
        activityScale: ['#111111', '#222222', '#333333', '#444444', '#555555'],
      },
    }),
  )

  assert.doesNotMatch(html, /Claude Leaderboard/)
  assert.match(html, /background:#101010/)
})

test('tooltip helper returns tokens, messages, and sessions lines', () => {
  const lines = getTooltipLines({
    date: '2026-06-01',
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_input_tokens: 250,
    cache_read_input_tokens: 250,
    messages: 3,
    sessions: 2,
  })

  assert.deepEqual(lines, ['2,000 tokens', '3 messages', '2 sessions'])
})
