'use client'

type Sort = 'tokens' | 'messages' | 'streak'
type Period = '7d' | '30d' | 'all'

interface SortBarProps {
  sort: Sort
  period: Period
  onSort: (s: Sort) => void
  onPeriod: (p: Period) => void
}

export default function SortBar({ sort, period, onSort, onPeriod }: SortBarProps) {
  const btn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--color-accent)] text-white'
        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
    }`

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1">
        {(['tokens', 'messages', 'streak'] as Sort[]).map((s) => (
          <button key={s} className={btn(sort === s)} onClick={() => onSort(s)}>
            {s === 'tokens' ? 'Tokens' : s === 'messages' ? 'Messages' : 'Streak'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-1">
        {(['7d', '30d', 'all'] as Period[]).map((p) => (
          <button key={p} className={btn(period === p)} onClick={() => onPeriod(p)}>
            {p === 'all' ? 'All time' : p}
          </button>
        ))}
      </div>
    </div>
  )
}
