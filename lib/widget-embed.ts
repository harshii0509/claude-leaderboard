import type { WidgetPreset } from './widget-types'

function withPreset(url: URL, preset: WidgetPreset) {
  url.searchParams.set('preset', preset)
  return url
}

export function buildPublicWidgetUrl(appUrl: string, publicId: string, preset: WidgetPreset) {
  return withPreset(new URL(`/embed/u/${publicId}`, appUrl), preset).toString()
}

export function buildPublicWidgetApiUrl(appUrl: string, publicId: string) {
  return new URL(`/api/public-widget/${publicId}`, appUrl).toString()
}

export function buildIframeEmbedSnippet(appUrl: string, publicId: string, preset: WidgetPreset) {
  const src = buildPublicWidgetUrl(appUrl, publicId, preset)
  return `<iframe src="${src}" width="760" height="420" style="border:0;border-radius:24px;overflow:hidden;" loading="lazy" title="Claude Leaderboard activity widget"></iframe>`
}

export function buildReactEmbedSnippet(appUrl: string, publicId: string, preset: WidgetPreset) {
  return [
    "import { LeaderboardWidget } from '@claude-leaderboard/widget-react'",
    '',
    'export default function ProfileWidget() {',
    '  return (',
    `    <LeaderboardWidget publicId="${publicId}" baseUrl="${appUrl}" preset="${preset}" />`,
    '  )',
    '}',
  ].join('\n')
}

