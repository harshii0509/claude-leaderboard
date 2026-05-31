'use client'

import Image from 'next/image'
import { LeaderboardEntry } from './Podium'
import { playHover } from '@/lib/audio'

interface RankingsTableProps {
  entries: LeaderboardEntry[]
  sort: 'tokens' | 'messages' | 'streak'
  onUserClick: (entry: LeaderboardEntry) => void
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

const RANK_BADGE: Record<number, { bg: string; border: string; color: string }> = {
  1: { bg: '#f5c842', border: '#b8900a', color: '#5a3c00' },
  2: { bg: '#c8d4e0', border: '#7a90a8', color: '#2a3a4a' },
  3: { bg: '#c8844a', border: '#8b5a2b', color: '#fff' },
}

const RING_CLASS: Record<number, string> = {
  1: 'rank-1',
  2: 'rank-2',
  3: 'rank-3',
}

export default function RankingsTable({ entries, sort, onUserClick }: RankingsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]/15">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]/10">
            <th className="text-left px-4 py-3 text-[var(--color-muted)] font-bold w-12">#</th>
            <th className="text-left px-4 py-3 text-[var(--color-muted)] font-bold">User</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-bold">Tokens</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-bold hidden sm:table-cell">Messages</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-bold hidden md:table-cell">Sessions</th>
            <th className="text-right px-4 py-3 text-[var(--color-muted)] font-bold">Streak</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const rank = idx + 1
            const badge = RANK_BADGE[rank]
            const ringClass = RING_CLASS[rank] ?? 'rank-default'
            return (
              <tr
                key={entry.user_id}
                className="row-enter border-b border-[var(--color-border)]/10 hover:bg-[var(--color-surface-2)] cursor-pointer transition-colors"
                style={{ '--row-index': idx } as React.CSSProperties}
                onMouseEnter={playHover}
                onClick={() => onUserClick(entry)}
              >
                <td className="px-4 py-3">
                  {badge ? (
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold ${rank <= 3 ? 'rank-pulse' : ''}`}
                      style={{ background: badge.bg, border: `2px solid ${badge.border}`, color: badge.color, boxShadow: `0 2px 0 -1px ${badge.border}` }}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted)] font-bold tabular-nums">{rank}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`avatar-ring ${ringClass}`} style={{ padding: '2px' }}>
                      <div className="game-avatar w-7 h-7">
                        {entry.image ? (
                          <Image src={entry.image} alt={entry.name} width={28} height={28} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs font-extrabold"
                            style={{ background: 'var(--color-accent)', color: '#0f0f13' }}
                          >
                            {entry.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-[var(--color-text)]">{entry.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--color-text)]">
                  {fmt(entry.total_tokens)}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--color-muted)] hidden sm:table-cell">
                  {fmt(entry.total_messages)}
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--color-muted)] hidden md:table-cell">
                  {entry.total_sessions}
                </td>
                <td className="px-4 py-3 text-right">
                  {entry.current_streak > 0 ? (
                    <span className="text-[var(--color-gold)] font-bold tabular-nums">
                      <span className="streak-fire">🔥</span> {entry.current_streak}d
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted)]">—</span>
                  )}
                </td>
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-muted)] font-bold">
                No data yet. Be the first to sync!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
