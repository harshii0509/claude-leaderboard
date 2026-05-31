'use client'

import { useState } from 'react'

interface DayData {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  messages: number
  sessions: number
}

interface ActivityHeatmapProps {
  activity: DayData[]
  days?: number
}

interface Cell {
  date: string
  tokens: number
  messages: number
  sessions: number
}

interface TooltipState {
  cell: Cell
  rect: DOMRect
}

function intensity(tokens: number, max: number) {
  if (tokens === 0 || max === 0) return 0
  return Math.ceil((tokens / max) * 4)
}

const COLORS = [
  'bg-[var(--color-surface-2)]',
  'bg-[var(--color-accent)]/20',
  'bg-[var(--color-accent)]/40',
  'bg-[var(--color-accent)]/70',
  'bg-[var(--color-accent)]',
]

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }

export default function ActivityHeatmap({ activity, days = 90 }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const today = new Date()
  const cells: Cell[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found = activity.find((a) => a.date === dateStr)
    cells.push({
      date: dateStr,
      tokens: found
        ? found.input_tokens + found.output_tokens + (found.cache_creation_input_tokens ?? 0) + (found.cache_read_input_tokens ?? 0)
        : 0,
      messages: found?.messages ?? 0,
      sessions: found?.sessions ?? 0,
    })
  }

  const max = Math.max(...cells.map((c) => c.tokens), 1)

  // Group into weeks (columns of 7 days)
  const weeks: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // Month label for each week column: show month if first day of that week is day 1-7
  const monthLabels: (string | null)[] = weeks.map((week) => {
    const firstDay = new Date(week[0].date + 'T00:00:00')
    return firstDay.getDate() <= 7 ? MONTH_ABBR[firstDay.getMonth()] : null
  })

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const tooltipCell = tooltip?.cell
  const tooltipRect = tooltip?.rect

  return (
    <div className="w-full relative">
      {/* Month labels row */}
      <div className="flex gap-[3px] mb-1 pl-6">
        {weeks.map((_, wi) => (
          <div key={wi} className="flex-1 text-[10px] text-[var(--color-muted)] font-medium truncate">
            {monthLabels[wi] ?? ''}
          </div>
        ))}
      </div>

      {/* Grid with day labels */}
      <div className="flex justify-between">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[3px] w-5 shrink-0">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex-1 text-[9px] text-[var(--color-muted)] flex items-center leading-none">
              {DAY_LABELS[i] ?? ''}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`heatmap-cell w-3 h-3 rounded-sm ${cell.tokens > 0 ? 'cursor-pointer' : ''} ${COLORS[intensity(cell.tokens, max)]}`}
                style={{ '--week-index': wi } as React.CSSProperties}
                onMouseEnter={(e) => setTooltip({ cell, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Rich tooltip */}
      {tooltip && tooltipCell && tooltipRect && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg shadow-lg text-xs"
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            top: tooltipRect.top - 8,
            left: tooltipRect.left + tooltipRect.width / 2,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-semibold mb-1">{formatDate(tooltipCell.date)}</div>
          {tooltipCell.tokens === 0 ? (
            <div className="opacity-70">No activity</div>
          ) : (
            <div className="flex flex-col gap-0.5 opacity-90">
              <div>{tooltipCell.tokens.toLocaleString()} tokens</div>
              <div>{tooltipCell.messages} messages</div>
              <div>{tooltipCell.sessions} session{tooltipCell.sessions !== 1 ? 's' : ''}</div>
            </div>
          )}
          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
            style={{ background: 'var(--color-text)' }}
          />
        </div>
      )}
    </div>
  )
}
