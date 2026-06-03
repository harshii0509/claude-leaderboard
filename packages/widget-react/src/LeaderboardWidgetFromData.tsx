'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PublicWidgetData, PublicWidgetDay, WidgetPreset } from './types'

export interface LeaderboardWidgetFromDataProps {
  data: PublicWidgetData
  preset?: WidgetPreset
  className?: string
}

const PRESET_THEME: Record<WidgetPreset, {
  frame: string
  text: string
  muted: string
  chip: string
  chipBorder: string
  accent: string[]
}> = {
  arcade: {
    frame: '#f1f5fa',
    text: '#212121',
    muted: '#5a6480',
    chip: 'rgba(255,255,255,0.72)',
    chipBorder: 'rgba(34,38,53,0.08)',
    accent: ['#deeaf5', 'rgba(166,211,69,0.2)', 'rgba(166,211,69,0.4)', 'rgba(166,211,69,0.7)', '#a6d345'],
  },
  night: {
    frame: '#020617',
    text: '#f8fafc',
    muted: '#cbd5e1',
    chip: 'rgba(15,23,42,0.86)',
    chipBorder: 'rgba(103,232,249,0.24)',
    accent: ['rgba(30,41,59,0.88)', 'rgba(34,211,238,0.18)', 'rgba(34,211,238,0.35)', 'rgba(34,211,238,0.68)', '#a5f3fc'],
  },
  paper: {
    frame: '#fffbeb',
    text: '#292524',
    muted: '#78716c',
    chip: 'rgba(255,255,255,0.75)',
    chipBorder: 'rgba(120,53,15,0.10)',
    accent: ['#e7e5e4', 'rgba(217,119,6,0.18)', 'rgba(217,119,6,0.34)', 'rgba(180,83,9,0.68)', '#92400e'],
  },
}

export function LeaderboardWidgetFromData({
  data,
  preset,
  className,
}: LeaderboardWidgetFromDataProps) {
  const resolvedPreset = preset ?? data.preset
  const theme = PRESET_THEME[resolvedPreset]
  const [tooltip, setTooltip] = useState<{ day: PublicWidgetDay; rect: DOMRect } | null>(null)
  const weeks = useMemo(() => buildWeeks(data.activity), [data.activity])
  const maxTokens = useMemo(
    () => Math.max(...data.activity.map(totalTokensForDay), 1),
    [data.activity],
  )

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 24,
        background: theme.frame,
        color: theme.text,
        border: `1px solid ${theme.chipBorder}`,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.10)',
        overflow: 'hidden',
        padding: 20,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {data.image ? (
          <img
            src={data.image}
            alt={data.displayName}
            width={44}
            height={44}
            style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover', border: '1px solid rgba(15, 23, 42, 0.08)' }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              background: theme.chip,
              border: `1px solid ${theme.chipBorder}`,
            }}
          >
            {data.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: theme.muted }}>
            Personal activity
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.displayName}
          </div>
        </div>
        <StatChip label="Streak" value={`${data.currentStreak}d`} theme={theme} />
        <StatChip label="Active days" value={String(data.totalActiveDays)} theme={theme} />
      </div>

      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(53, 13px)', gridTemplateRows: '14px repeat(7, 13px)', gap: 3, minWidth: 760 }}>
          <div />
          {weeks.map((week, wi) => (
            <div key={`month-${wi}`} style={{ fontSize: 10, color: theme.muted, display: 'flex', alignItems: 'center' }}>
              {week[0] && isMonthTick(week[0].date) ? monthAbbr(week[0].date) : ''}
            </div>
          ))}

          {Array.from({ length: 7 }, (_, dayIndex) => (
            <FragmentRow
              key={dayIndex}
              label={dayIndex === 1 ? 'Mon' : dayIndex === 3 ? 'Wed' : dayIndex === 5 ? 'Fri' : ''}
              cells={weeks}
              dayIndex={dayIndex}
              maxTokens={maxTokens}
              theme={theme}
              onHover={setTooltip}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: theme.muted }}>
        <span>Use in Framer, websites, or React apps.</span>
        <span style={{ fontWeight: 700 }}>Claude Leaderboard</span>
      </div>

      {tooltip ? <Tooltip tooltip={tooltip} theme={theme} /> : null}
    </div>
  )
}

function FragmentRow({
  label,
  cells,
  dayIndex,
  maxTokens,
  theme,
  onHover,
}: {
  label: string
  cells: PublicWidgetDay[][]
  dayIndex: number
  maxTokens: number
  theme: (typeof PRESET_THEME)[WidgetPreset]
  onHover: (value: { day: PublicWidgetDay; rect: DOMRect } | null) => void
}) {
  return (
    <>
      <div style={{ fontSize: 9, color: theme.muted, display: 'flex', alignItems: 'center' }}>{label}</div>
      {cells.map((week, wi) => {
        const day = week[dayIndex]
        if (!day) return <div key={`empty-${dayIndex}-${wi}`} />
        return (
          <div
            key={day.date}
            onMouseEnter={(event) => onHover({ day, rect: event.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => onHover(null)}
            style={{
              width: 13,
              height: 13,
              borderRadius: 3,
              cursor: totalTokensForDay(day) > 0 ? 'pointer' : 'default',
              background: theme.accent[intensity(totalTokensForDay(day), maxTokens)],
            }}
          />
        )
      })}
    </>
  )
}

function StatChip({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: (typeof PRESET_THEME)[WidgetPreset]
}) {
  return (
    <div
      style={{
        minWidth: 88,
        borderRadius: 16,
        padding: '8px 12px',
        background: theme.chip,
        border: `1px solid ${theme.chipBorder}`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, color: theme.muted }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

function Tooltip({
  tooltip,
  theme,
}: {
  tooltip: { day: PublicWidgetDay; rect: DOMRect }
  theme: (typeof PRESET_THEME)[WidgetPreset]
}) {
  const totalTokens = totalTokensForDay(tooltip.day)
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 99999,
        top: tooltip.rect.top - 10,
        left: tooltip.rect.left + tooltip.rect.width / 2,
        transform: 'translate(-50%, -100%)',
        padding: '10px 12px',
        borderRadius: 14,
        background: theme.text,
        color: theme.frame,
        boxShadow: '0 16px 44px rgba(15, 23, 42, 0.24)',
        fontSize: 12,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{formatDate(tooltip.day.date)}</div>
      {totalTokens === 0 ? (
        <div style={{ opacity: 0.72 }}>No activity</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.92 }}>
          <div>{totalTokens.toLocaleString()} tokens</div>
          <div>{tooltip.day.messages} messages</div>
          <div>{tooltip.day.sessions} session{tooltip.day.sessions !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  )
}

function totalTokensForDay(day: PublicWidgetDay) {
  return day.input_tokens + day.output_tokens + day.cache_creation_input_tokens + day.cache_read_input_tokens
}

function intensity(tokens: number, max: number) {
  if (tokens === 0 || max === 0) return 0
  return Math.ceil((tokens / max) * 4)
}

function buildWeeks(activity: PublicWidgetDay[]) {
  const activityMap = new Map(activity.map((day) => [day.date, day]))
  const today = new Date()
  const cells: PublicWidgetDay[] = []

  for (let i = 364; i >= 0; i -= 1) {
    const nextDate = new Date(today)
    nextDate.setDate(nextDate.getDate() - i)
    const dateStr = nextDate.toISOString().slice(0, 10)
    const existing = activityMap.get(dateStr)
    cells.push(
      existing ?? {
        date: dateStr,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        messages: 0,
        sessions: 0,
      },
    )
  }

  const weeks: PublicWidgetDay[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

function isMonthTick(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDate() <= 7
}

function monthAbbr(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
