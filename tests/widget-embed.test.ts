import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildIframeEmbedSnippet,
  buildPublicWidgetApiUrl,
  buildPublicWidgetUrl,
  buildReactEmbedSnippet,
} from '../lib/widget-embed.ts'
import { DEFAULT_WIDGET_PRESET, isWidgetPreset } from '../lib/widget-types.ts'

test('buildPublicWidgetUrl includes the widget path and preset', () => {
  const url = buildPublicWidgetUrl('https://leaderboard.example.com', 'abc123widget', 'night')
  assert.equal(
    url,
    'https://leaderboard.example.com/embed/u/abc123widget?preset=night',
  )
})

test('buildPublicWidgetApiUrl points to the public JSON contract', () => {
  const url = buildPublicWidgetApiUrl('https://leaderboard.example.com/app', 'abc123widget')
  assert.equal(url, 'https://leaderboard.example.com/api/public-widget/abc123widget')
})

test('buildIframeEmbedSnippet emits an iframe with a public widget URL', () => {
  const snippet = buildIframeEmbedSnippet('https://leaderboard.example.com', 'abc123widget', DEFAULT_WIDGET_PRESET)
  assert.match(snippet, /<iframe/)
  assert.match(snippet, /embed\/u\/abc123widget\?preset=arcade/)
  assert.match(snippet, /Claude Leaderboard activity widget/)
})

test('buildReactEmbedSnippet uses the package-style hosted-data API', () => {
  const snippet = buildReactEmbedSnippet('https://leaderboard.example.com', 'abc123widget', 'paper')
  assert.match(snippet, /@claude-leaderboard\/widget-react/)
  assert.match(snippet, /publicId="abc123widget"/)
  assert.match(snippet, /preset="paper"/)
})

test('isWidgetPreset only accepts supported presets', () => {
  assert.equal(isWidgetPreset('arcade'), true)
  assert.equal(isWidgetPreset('night'), true)
  assert.equal(isWidgetPreset('paper'), true)
  assert.equal(isWidgetPreset('neon'), false)
})
