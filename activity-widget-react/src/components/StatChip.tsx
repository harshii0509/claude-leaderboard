import type { ActivityWidgetTheme } from '../types.js'

export function StatChip({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: ActivityWidgetTheme
}) {
  return (
    <div
      style={{
        minWidth: 88,
        borderRadius: 16,
        padding: '8px 12px',
        background: theme.chipBackground,
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
