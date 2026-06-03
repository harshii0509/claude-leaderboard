'use client'

import { LeaderboardWidgetFromData } from '@/packages/widget-react/src/LeaderboardWidgetFromData'
import type { PublicWidgetData } from '@/packages/widget-react/src/types'
import type { DayData } from './ActivityHeatmap'
import { DEFAULT_WIDGET_PRESET, type WidgetPreset } from '@/lib/widget-types'

interface ActivityWidgetProps {
  displayName: string
  image: string | null
  currentStreak: number
  totalActiveDays: number
  activity: DayData[]
  preset?: WidgetPreset
  compact?: boolean
  branded?: boolean
}

export default function ActivityWidget({
  displayName,
  image,
  currentStreak,
  totalActiveDays,
  activity,
  preset = DEFAULT_WIDGET_PRESET,
  compact: _compact = false,
  branded: _branded = true,
}: ActivityWidgetProps) {
  const data: PublicWidgetData = {
    publicId: 'preview',
    displayName,
    image,
    preset,
    currentStreak,
    totalActiveDays,
    lastSyncedAt: null,
    activity: activity.map((day) => ({
      ...day,
      cache_creation_input_tokens: day.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: day.cache_read_input_tokens ?? 0,
    })),
  }

  return (
    <LeaderboardWidgetFromData className="w-full" data={data} preset={preset} />
  )
}
