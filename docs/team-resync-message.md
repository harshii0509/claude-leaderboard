# Team Resync Message

Use this after `npm run leaderboard:rescan` when you want everyone to repopulate the leaderboard from fresh local history.

## Slack / email draft

We upgraded the leaderboard sync pipeline to improve streak accuracy and rebuild the rankings from raw usage history.

Please run your setup command one more time from the app's **Setup** page, or rerun:

```bash
python3 ~/.claude/sync.py
```

That one sync will:

- rescan your local Claude history
- include local Codex usage if Codex is installed
- repopulate your leaderboard data under the new scoring pipeline

After that, your normal Claude Stop hook will continue syncing automatically again.

If your profile still looks empty after running it once, send me a screenshot of the terminal output.
