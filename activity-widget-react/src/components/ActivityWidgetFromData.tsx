'use client'

import { useMemo, useState } from 'react'
import { HeatmapGrid } from './HeatmapGrid.js'
import { StatChip } from './StatChip.js'
import { Tooltip } from './Tooltip.js'
import { mergeWidgetTheme } from '../theme/mergeTheme.js'
import { totalTokensForDay } from '../data/widgetData.js'
import type { ActivityWidgetData, ActivityWidgetDay, ActivityWidgetPreset, ActivityWidgetTheme } from '../types.js'

export interface ActivityWidgetFromDataProps {
  data: ActivityWidgetData
  preset?: ActivityWidgetPreset
  theme?: Partial<ActivityWidgetTheme>
  className?: string
}

export function ActivityWidgetFromData({
  data,
  preset,
  theme,
  className,
}: ActivityWidgetFromDataProps) {
  const resolvedPreset = preset ?? data.preset
  const resolvedTheme = mergeWidgetTheme(resolvedPreset, theme)
  const [tooltip, setTooltip] = useState<{ day: ActivityWidgetDay; rect: DOMRect } | null>(null)
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
        background: resolvedTheme.frame,
        color: resolvedTheme.text,
        border: `1px solid ${resolvedTheme.chipBorder}`,
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
            style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover', border: `1px solid ${resolvedTheme.chipBorder}` }}
          />
        ) : (
          <div
            aria-label="avatar fallback"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              background: resolvedTheme.avatarBackground,
              border: `1px solid ${resolvedTheme.chipBorder}`,
            }}
          >
            {data.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: resolvedTheme.muted }}>
            Personal activity
          </div>
          <div
            title={data.displayName}
            style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {data.displayName}
          </div>
        </div>
        <StatChip label="Streak" value={`${data.currentStreak}d`} theme={resolvedTheme} />
        <StatChip label="Active days" value={String(data.totalActiveDays)} theme={resolvedTheme} />
      </div>

      <HeatmapGrid
        activity={data.activity}
        maxTokens={maxTokens}
        theme={resolvedTheme}
        onHover={setTooltip}
      />

      {tooltip ? <Tooltip day={tooltip.day} rect={tooltip.rect} theme={resolvedTheme} /> : null}
    </div>
  )
}
