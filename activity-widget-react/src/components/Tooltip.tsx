import { formatDate, getTooltipLines } from '../data/widgetData.js'
import type { ActivityWidgetDay, ActivityWidgetTheme } from '../types.js'

export function Tooltip({
  day,
  rect,
  theme,
}: {
  day: ActivityWidgetDay
  rect: DOMRect
  theme: ActivityWidgetTheme
}) {
  const lines = getTooltipLines(day)

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 99999,
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
        padding: '10px 12px',
        borderRadius: 14,
        background: theme.tooltipBackground,
        color: theme.tooltipText,
        boxShadow: '0 16px 44px rgba(15, 23, 42, 0.24)',
        fontSize: 12,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{formatDate(day.date)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.92 }}>
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  )
}
