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

## Operator checklist

After you send the message:

1. Run `npm run leaderboard:status` to see who is still pending.
2. Open `/admin/leaderboard` if you want the same rollout status in the app UI, plus copyable resync messaging built from the live pending-user list.
3. When the pending list reaches zero, optionally run `npm run leaderboard:rebuild` for one last rollup refresh.
