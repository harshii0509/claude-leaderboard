'use client'

import { useState } from 'react'
import type { LeaderboardSyncStatusUser } from '@/lib/leaderboard-admin'

interface AdminResyncPanelProps {
  syncGeneration: number
  pendingUsers: LeaderboardSyncStatusUser[]
}

function buildResyncMessage(syncGeneration: number, pendingUsers: LeaderboardSyncStatusUser[]) {
  const recipients = pendingUsers
    .map((user) => user.name ?? user.email ?? 'Unknown user')
    .join(', ')

  return [
    `Leaderboard sync generation ${syncGeneration} is live.`,
    '',
    'We upgraded the leaderboard pipeline to fix streak logic, rebuild scoring from raw usage events, and refill the rankings safely.',
    '',
    'If your name is in the pending list below, please run the Setup command once from the app or rerun:',
    'python3 ~/.claude/sync.py',
    '',
    'That one sync will replay your local history into the new pipeline. After that, your normal Claude Stop hook will continue syncing automatically.',
    '',
    pendingUsers.length > 0 ? `Pending users: ${recipients}` : 'Everyone is already synced for this generation.',
  ].join('\n')
}

function buildPendingList(pendingUsers: LeaderboardSyncStatusUser[]) {
  if (pendingUsers.length === 0) {
    return 'Everyone has already synced for the current generation.'
  }

  return pendingUsers
    .map((user) => {
      const name = user.name ?? 'Unknown user'
      const email = user.email ?? 'No email'
      const lastSync = user.last_synced_at ?? 'never'
      const lastActivity = user.last_activity_date ?? 'none'
      return `${name} <${email}> | last sync: ${lastSync} | last activity: ${lastActivity}`
    })
    .join('\n')
}

export default function AdminResyncPanel({
  syncGeneration,
  pendingUsers,
}: AdminResyncPanelProps) {
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedList, setCopiedList] = useState(false)

  const message = buildResyncMessage(syncGeneration, pendingUsers)
  const pendingList = buildPendingList(pendingUsers)

  async function copyText(text: string, type: 'message' | 'list') {
    await navigator.clipboard.writeText(text)

    if (type === 'message') {
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2000)
      return
    }

    setCopiedList(true)
    setTimeout(() => setCopiedList(false), 2000)
  }

  return (
    <div className="game-card p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text)] font-semibold">Rollout helper</p>
          <p className="text-sm text-[var(--color-muted)]">
            Copy a ready-to-send resync note or the current pending-user list from live data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyText(message, 'message')}
            className="game-btn text-xs px-3 py-1.5 text-black font-bold"
          >
            {copiedMessage ? 'Message Copied!' : 'Copy Resync Message'}
          </button>
          <button
            type="button"
            onClick={() => copyText(pendingList, 'list')}
            className="game-btn-ghost text-xs px-3 py-1.5 text-white font-bold"
          >
            {copiedList ? 'List Copied!' : 'Copy Pending List'}
          </button>
        </div>
      </div>

      <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--color-muted)] font-bold">Preview</p>
        <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-[var(--color-text)] font-mono">
          {message}
        </pre>
      </div>
    </div>
  )
}
