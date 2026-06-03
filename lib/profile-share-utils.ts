import type { ProfileShareCardData } from './profile-share-types'

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return String(value)
}

export function getTopModelLabel(models: Record<string, number> | null | undefined) {
  const topEntry = Object.entries(models ?? {}).sort((a, b) => b[1] - a[1])[0]
  if (!topEntry) return null

  return topEntry[0].replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

export function getSyncLabel(lastSyncedAt: string | null) {
  if (!lastSyncedAt) return 'Ready to start syncing'

  const diffMs = Date.now() - new Date(lastSyncedAt).getTime()
  const diffDays = diffMs / 86_400_000

  if (diffDays < 1) return 'Synced today'
  if (diffDays < 7) return `Synced ${Math.floor(diffDays)}d ago`
  return 'Sync due soon'
}

export function buildShareCaption(data: Omit<ProfileShareCardData, 'caption'>) {
  const headline = `Tracking ${formatCompactNumber(data.totalTokens)} AI tokens across ${formatCompactNumber(data.totalMessages)} messages and ${formatCompactNumber(data.totalSessions)} sessions on Claude Leaderboard.`
  const streakLine =
    data.currentStreak > 0
      ? ` Current streak: ${data.currentStreak} day${data.currentStreak === 1 ? '' : 's'}.`
      : ''
  const modelLine = data.topModel ? ` Top model lately: ${data.topModel}.` : ''

  return `${headline}${streakLine}${modelLine}`.trim()
}

export function buildShareFilename(displayName: string) {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'profile'}-share-card.png`
}
