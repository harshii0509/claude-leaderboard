# Widget Embeds

Claude Leaderboard supports personal activity widgets that can be published from a user's profile and embedded elsewhere.

## What ships today

- Public widget page: `/embed/u/:publicId`
- Public widget JSON: `/api/public-widget/:publicId`
- Profile-side publish toggle, preset selection, and snippet generation
- Framer-compatible iframe embed
- React package source in `packages/widget-react`

## Embed paths

### 1. Universal iframe embed

Best for:

- Framer
- Webflow
- plain HTML sites
- portfolio builders

Example:

```html
<iframe
  src="https://your-instance.com/embed/u/your-public-id?preset=arcade"
  width="760"
  height="420"
  style="border:0;border-radius:24px;overflow:hidden;"
  loading="lazy"
  title="Claude Leaderboard activity widget"
></iframe>
```

### 2. Public JSON contract

Best for:

- custom renderers
- non-React consumers
- debugging widget payloads

Example:

```text
GET https://your-instance.com/api/public-widget/your-public-id
```

The route is CORS-enabled so external websites and package consumers can fetch it directly.

### 3. React package

Best for:

- React
- Next.js
- custom product surfaces that want native component integration

Package location in this repo:

```text
packages/widget-react
```

Hosted-data-first usage:

```tsx
import { LeaderboardWidget } from '@claude-leaderboard/widget-react'

export default function ProfileWidget() {
  return (
    <LeaderboardWidget
      publicId="your-public-widget-id"
      baseUrl="https://your-instance.com"
      preset="arcade"
    />
  )
}
```

## Local package verification

Build the package output:

```bash
npm run build:widget-react
```

Verify what would publish without depending on the global npm cache:

```bash
npm run verify:widget-react
```

That command:

- builds `packages/widget-react/dist`
- runs `npm pack --dry-run`
- uses a repo-local `.npm-cache/` directory instead of `~/.npm`

## Release checklist

Before publishing the package:

1. Run `npm test`
2. Run `npm run typecheck`
3. Run `npm run build`
4. Run `npm run verify:widget-react`
5. Confirm `packages/widget-react/README.md` matches the current API

## Notes

- The current React package is designed around hosted public widget data, not arbitrary raw activity input.
- Framer support remains iframe-first even though the React package exists.
- The solo hosted individual product is still a later phase; today's widget system is built on the self-hosted team product.
