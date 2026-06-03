import { buildWeeks, intensity, isMonthTick, monthAbbr, totalTokensForDay } from '../data/widgetData.js'
import type { ActivityWidgetDay, ActivityWidgetTheme } from '../types.js'

export function HeatmapGrid({
  activity,
  maxTokens,
  theme,
  onHover,
}: {
  activity: ActivityWidgetDay[]
  maxTokens: number
  theme: ActivityWidgetTheme
  onHover: (value: { day: ActivityWidgetDay; rect: DOMRect } | null) => void
}) {
  const weeks = buildWeeks(activity)

  return (
    <div style={{ marginTop: 16, overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(53, 13px)', gridTemplateRows: '14px repeat(7, 13px)', gap: 3, minWidth: 760 }}>
        <div />
        {weeks.map((week, wi) => (
          <div key={`month-${wi}`} style={{ fontSize: 10, color: theme.muted, display: 'flex', alignItems: 'center' }}>
            {week[0] && isMonthTick(week[0].date) ? monthAbbr(week[0].date) : ''}
          </div>
        ))}

        {Array.from({ length: 7 }, (_, dayIndex) => (
          <Row
            key={dayIndex}
            label={dayIndex === 1 ? 'Mon' : dayIndex === 3 ? 'Wed' : dayIndex === 5 ? 'Fri' : ''}
            cells={weeks}
            dayIndex={dayIndex}
            maxTokens={maxTokens}
            theme={theme}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  )
}

function Row({
  label,
  cells,
  dayIndex,
  maxTokens,
  theme,
  onHover,
}: {
  label: string
  cells: ActivityWidgetDay[][]
  dayIndex: number
  maxTokens: number
  theme: ActivityWidgetTheme
  onHover: (value: { day: ActivityWidgetDay; rect: DOMRect } | null) => void
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
            aria-label={`${day.date} activity cell`}
            title={`${day.date}`}
            onMouseEnter={(event) => onHover({ day, rect: event.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => onHover(null)}
            style={{
              width: 13,
              height: 13,
              borderRadius: 3,
              cursor: totalTokensForDay(day) > 0 ? 'pointer' : 'default',
              background: theme.activityScale[intensity(totalTokensForDay(day), maxTokens)],
            }}
          />
        )
      })}
    </>
  )
}
