# `@claude-leaderboard/activity-widget-react`

White-label React activity widget renderer for Claude Leaderboard hosted widgets and custom activity data.

## What it supports

- Hosted fetch mode from a Claude Leaderboard instance
- Direct data mode for custom apps and personal sites
- Typed theme customization with semantic color slots
- Built-in convenience presets: `arcade`, `night`, `paper`
- Interactive yearly heatmap with hover tooltip

## Install

```bash
npm install @claude-leaderboard/activity-widget-react
```

## Hosted mode

```tsx
import { ActivityWidget } from '@claude-leaderboard/activity-widget-react'

export function PortfolioWidget() {
  return (
    <ActivityWidget
      publicId="your-public-id"
      baseUrl="https://your-claude-leaderboard-instance.com"
      preset="night"
      theme={{
        frame: '#0b1020',
        text: '#f8fafc',
        muted: '#94a3b8',
        activityScale: ['#0f172a', '#1d4ed8', '#2563eb', '#60a5fa', '#bfdbfe'],
      }}
    />
  )
}
```

## Direct data mode

```tsx
import { ActivityWidgetFromData, type ActivityWidgetData } from '@claude-leaderboard/activity-widget-react'

const data: ActivityWidgetData = {
  publicId: 'demo-user',
  displayName: 'Harshi',
  image: null,
  preset: 'arcade',
  currentStreak: 12,
  totalActiveDays: 98,
  lastSyncedAt: new Date().toISOString(),
  activity: [],
}

export function CustomWidget() {
  return (
    <ActivityWidgetFromData
      data={data}
      theme={{
        frame: '#fff7ed',
        text: '#431407',
        muted: '#9a3412',
        chipBackground: '#ffffff',
        chipBorder: '#fdba74',
        tooltipBackground: '#431407',
        tooltipText: '#fff7ed',
        avatarBackground: '#fed7aa',
        activityScale: ['#ffedd5', '#fdba74', '#fb923c', '#ea580c', '#9a3412'],
      }}
    />
  )
}
```

## Theme API

```ts
type ActivityWidgetTheme = {
  frame: string
  text: string
  muted: string
  chipBackground: string
  chipBorder: string
  tooltipBackground: string
  tooltipText: string
  avatarBackground: string
  activityScale: [string, string, string, string, string]
}
```

Pass `theme` as a partial object. Missing fields are filled from the chosen preset.

If both `preset` and `theme` are provided, `theme` wins per field.

## Exports

- `ActivityWidget`
- `ActivityWidgetFromData`
- `fetchActivityWidgetData`
- `buildActivityWidgetDataUrl`
- `getPresetTheme`
- `mergeWidgetTheme`
- `type ActivityWidgetTheme`
- `type ActivityWidgetData`
- `type ActivityWidgetDay`
- `type ActivityWidgetPreset`

## Examples

See [`examples/`](/Users/harshii/Developer/side-projects/claude-leaderboard/activity-widget-react/examples) for hosted and direct-data starter snippets.
