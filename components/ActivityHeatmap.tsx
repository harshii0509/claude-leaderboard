'use client'

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

export default function ActivityHeatmap({ activity, days = 90 }: ActivityHeatmapProps) {
  const today = new Date()
  const cells: { date: string; tokens: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found = activity.find((a) => a.date === dateStr)
    cells.push({
      date: dateStr,
      tokens: found
        ? (found.input_tokens + found.output_tokens + (found.cache_creation_input_tokens ?? 0) + (found.cache_read_input_tokens ?? 0))
        : 0,
    })
  }

  const max = Math.max(...cells.map((c) => c.tokens), 1)

  // Group into weeks (columns)
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.tokens.toLocaleString()} tokens`}
                className={`heatmap-cell w-3 h-3 rounded-sm ${COLORS[intensity(cell.tokens, max)]}`}
                style={{ '--week-index': wi } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
