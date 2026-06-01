'use client'

import { Fragment, useRef, useEffect, useState } from 'react'

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

const CELL = 13         // px — square cell size
const GAP = 3           // px — gap between cells and between rows/cols
const DAY_LABEL_W = 24  // px — width of the day-of-week label column

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

export default function ActivityHeatmap({ activity }: ActivityHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(480)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerWidth(el.offsetWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fill the container with whole weeks at the fixed cell size
  const numWeeks = Math.max(8, Math.floor((containerWidth - DAY_LABEL_W) / (CELL + GAP)))
  const numDays = numWeeks * 7

  const today = new Date()
  const cells: Cell[] = []
  for (let i = numDays - 1; i >= 0; i--) {
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

  // Weeks as columns; weeks[wi][dayIndex] = cell
  const weeks: Cell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // Month label per week column: show abbreviation when week starts on days 1-7
  const monthLabels: (string | null)[] = weeks.map((week) => {
    const d = new Date(week[0].date + 'T00:00:00')
    return d.getDate() <= 7 ? MONTH_ABBR[d.getMonth()] : null
  })

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div ref={containerRef} className="w-full relative">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${DAY_LABEL_W}px repeat(${numWeeks}, ${CELL}px)`,
          gridTemplateRows: `14px repeat(7, ${CELL}px)`,
          gap: `${GAP}px`,
        }}
      >
        {/* Row 1: empty corner + month labels (same columns as week cells → perfect alignment) */}
        <div />
        {weeks.map((_, wi) => (
          <div key={wi} className="text-[10px] text-[var(--color-muted)] font-medium truncate flex items-center">
            {monthLabels[wi] ?? ''}
          </div>
        ))}

        {/* Rows 2–8: day-of-week label + one cell per week for that day */}
        {Array.from({ length: 7 }, (_, dayIndex) => (
          <Fragment key={dayIndex}>
            <div className="text-[9px] text-[var(--color-muted)] flex items-center leading-none">
              {DAY_LABELS[dayIndex] ?? ''}
            </div>
            {weeks.map((week, wi) => {
              const cell = week[dayIndex]
              if (!cell) return <div key={wi} />
              return (
                <div
                  key={wi}
                  className={`heatmap-cell rounded-sm ${cell.tokens > 0 ? 'cursor-pointer' : ''} ${COLORS[intensity(cell.tokens, max)]}`}
                  style={{ '--week-index': wi } as React.CSSProperties}
                  onMouseEnter={(e) => setTooltip({ cell, rect: e.currentTarget.getBoundingClientRect() })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </Fragment>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg shadow-lg text-xs"
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-surface)',
            top: tooltip.rect.top - 8,
            left: tooltip.rect.left + tooltip.rect.width / 2,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-semibold mb-1">{formatDate(tooltip.cell.date)}</div>
          {tooltip.cell.tokens === 0 ? (
            <div className="opacity-70">No activity</div>
          ) : (
            <div className="flex flex-col gap-0.5 opacity-90">
              <div>{tooltip.cell.tokens.toLocaleString()} tokens</div>
              <div>{tooltip.cell.messages} messages</div>
              <div>{tooltip.cell.sessions} session{tooltip.cell.sessions !== 1 ? 's' : ''}</div>
            </div>
          )}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
            style={{ background: 'var(--color-text)' }}
          />
        </div>
      )}
    </div>
  )
}
