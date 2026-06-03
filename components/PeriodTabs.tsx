'use client'

import { useRef, useState } from 'react'
import { playSort } from '@/lib/audio'

type Period = '7d' | '30d' | 'all'

interface PeriodTabsProps {
  period: Period
  onPeriod: (period: Period) => void
}

export default function PeriodTabs({ period, onPeriod }: PeriodTabsProps) {
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
    <div className="flex items-center gap-1 bg-[var(--color-surface-2)] rounded-2xl border border-[var(--color-border)]/10 p-1 w-fit">
      {(['7d', '30d', 'all'] as Period[]).map((value) => (
        <button
          key={value}
          className={`${period === value ? active : inactive}${justSelected === value ? ' btn-select' : ''}`}
          onClick={() => selectWithPop(value, () => onPeriod(value))}
        >
          {value === 'all' ? 'All time' : value}
        </button>
      ))}
    </div>
  )
}
