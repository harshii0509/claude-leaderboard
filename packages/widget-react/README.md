# `@claude-leaderboard/widget-react`

React renderer for Claude Leaderboard public activity widgets.

## Usage

```tsx
import { LeaderboardWidget } from '@claude-leaderboard/widget-react'

export default function ProfileWidget() {
  return (
    <LeaderboardWidget
      publicId="your-public-widget-id"
      baseUrl="https://your-claude-leaderboard-instance.com"
      preset="arcade"
    />
  )
}
```

## Notes

- The package fetches public widget data from `/api/public-widget/:publicId`
- Widget consumers need the upstream Claude Leaderboard instance to have widget publishing enabled for that user
- Framer support remains easiest through iframe embeds; this package is primarily for React/Next consumers
