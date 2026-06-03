'use client'

import { useState, useRef } from 'react'
import { playSort } from '@/lib/audio'
import type { LeaderboardPeriod, LeaderboardSort } from '@/lib/leaderboard-types'

interface SortBarProps {
  sort: LeaderboardSort
  period: Exclude<LeaderboardPeriod, '7d'>
  onSort: (s: LeaderboardSort) => void
  onPeriod: (p: Exclude<LeaderboardPeriod, '7d'>) => void
}

export default function SortBar({ sort, period, onSort, onPeriod }: SortBarProps) {
  const [justSelected, setJustSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectWithPop = (key: string, action: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    playSort()
    action()
    setJustSelected(key)
    timerRef.current = setTimeout(() => setJustSelected(null), 250)
  }

  const active =
    'px-3 py-2 rounded-xl text-sm font-bold text-black cursor-pointer transition-[transform,box-shadow] ' +
    'bg-[var(--color-accent)] border-2 border-[var(--color-accent-border)] ' +
    'shadow-[0_3px_0_-1px_var(--color-accent-border)] ' +
    'active:translate-y-[2px] active:shadow-none'

  const inactive =
    'px-3 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ' +
    'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 bg-[var(--color-surface-2)] rounded-2xl border border-[var(--color-border)]/10 p-1">
        {(['weekly', 'tokens', 'streak'] as LeaderboardSort[]).map((s) => (
          <button
            key={s}
            className={`${sort === s ? active : inactive}${justSelected === s ? ' btn-select' : ''}`}
            onClick={() => selectWithPop(s, () => onSort(s))}
          >
            {s === 'weekly' ? (period === 'week' ? 'Weekly Score' : 'Score') : s === 'tokens' ? 'Tokens' : 'Streak'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 bg-[var(--color-surface-2)] rounded-2xl border border-[var(--color-border)]/10 p-1">
        {(['week', '30d', 'all'] as Exclude<LeaderboardPeriod, '7d'>[]).map((p) => (
          <button
            key={p}
            className={`${period === p ? active : inactive}${justSelected === p ? ' btn-select' : ''}`}
            onClick={() => selectWithPop(p, () => onPeriod(p))}
          >
            {p === 'week' ? 'This week' : p === 'all' ? 'All time' : '30 days'}
          </button>
        ))}
      </div>
    </div>
  )
}
