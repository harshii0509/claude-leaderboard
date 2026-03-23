'use client'

import { useState, Fragment } from 'react'
import Image from 'next/image'
import { LeaderboardEntry } from './Podium'
import DetailPanel from './DetailPanel'

interface RankingsTableProps {
  entries: LeaderboardEntry[]
  sort: 'tokens' | 'messages' | 'streak'
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function RankingsTable({ entries, sort }: RankingsTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (id: string) => setExpanded((prev) => (prev === id ? null : id))

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium w-10">#</th>
            <th className="text-left px-4 py-3 text-[var(--color-muted)] font-medium">User</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Tokens</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium hidden sm:table-cell">Messages</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium hidden md:table-cell">Sessions</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-medium">Streak</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <Fragment key={entry.user_id}>
              <tr
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                onClick={() => toggle(entry.user_id)}
              >
                <td className="px-4 py-3 text-[var(--color-muted)] font-mono">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {entry.image ? (
                      <Image src={entry.image} alt={entry.name} width={28} height={28} className="rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-xs font-bold text-white">
                        {entry.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[var(--color-text)]">{entry.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--color-text)]">
                  {fmt(entry.total_tokens)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--color-muted)] hidden sm:table-cell">
                  {fmt(entry.total_messages)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--color-muted)] hidden md:table-cell">
                  {entry.total_sessions}
                </td>
                <td className="px-4 py-3 text-right">
                  {entry.current_streak > 0 ? (
                    <span className="text-[var(--color-gold)]">
                      <span className="streak-fire">🔥</span> {entry.current_streak}d
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
              </tr>
              {expanded === entry.user_id && (
                <tr key={`${entry.user_id}-detail`}>
                  <td colSpan={6} className="p-0">
                    <DetailPanel userId={entry.user_id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-muted)]">
                No data yet. Be the first to sync!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
