'use client'

import { useState, useRef } from 'react'
import { playSort, unlockAudio } from '@/lib/audio'

type Sort = 'tokens' | 'messages' | 'streak'
type Period = '7d' | '30d' | 'all'

interface SortBarProps {
  sort: Sort
  period: Period
  onSort: (s: Sort) => void
  onPeriod: (p: Period) => void
}

export default function SortBar({ sort, period, onSort, onPeriod }: SortBarProps) {
  const [justSelected, setJustSelected] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectWithPop = async (key: string, action: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await unlockAudio()
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
        {(['tokens', 'messages', 'streak'] as Sort[]).map((s) => (
          <button
            key={s}
            className={`${sort === s ? active : inactive}${justSelected === s ? ' btn-select' : ''}`}
            onPointerDown={() => {
              void unlockAudio()
            }}
            onClick={() => {
              void selectWithPop(s, () => onSort(s))
            }}
          >
            {s === 'tokens' ? 'Tokens' : s === 'messages' ? 'Messages' : 'Streak'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 bg-[var(--color-surface-2)] rounded-2xl border border-[var(--color-border)]/10 p-1">
        {(['7d', '30d', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            className={`${period === p ? active : inactive}${justSelected === p ? ' btn-select' : ''}`}
            onPointerDown={() => {
              void unlockAudio()
            }}
            onClick={() => {
              void selectWithPop(p, () => onPeriod(p))
            }}
          >
            {p === 'all' ? 'All time' : p}
          </button>
        ))}
      </div>
    </div>
  )
}
