import { NextRequest } from 'next/server'
import { consumeInstallToken } from '@/lib/sync-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  let syncToken: string | null = null
  try {
    syncToken = await consumeInstallToken(token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: message.includes('inactive') ? 403 : 500 })
  }

  if (!syncToken) {
    return Response.json({ error: 'Invalid or expired install token' }, { status: 404 })
  }

  const script = `#!/usr/bin/env bash
set -euo pipefail

SYNC_TOKEN="${syncToken}"
APP_URL="${appUrl}"
CLAUDE_DIR="$HOME/.claude"
SYNC_SCRIPT="$CLAUDE_DIR/sync.py"
CONFIG_FILE="$CLAUDE_DIR/sync_config.json"
SETTINGS="$CLAUDE_DIR/settings.json"

echo "Installing Claude Leaderboard sync..."
mkdir -p "$CLAUDE_DIR"

# Download sync script
curl -fsSL "$APP_URL/sync.py" -o "$SYNC_SCRIPT"
chmod +x "$SYNC_SCRIPT"

# Write config
cat > "$CONFIG_FILE" <<EOF
{
  "sync_token": "$SYNC_TOKEN",
  "api_url": "$APP_URL/api/sync",
  "schema_version": 2
}
EOF

# Add Stop hook to Claude settings (idempotent)
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

python3 - "$SETTINGS" "$SYNC_SCRIPT" <<'PYEOF'
import json, sys
settings_path, script_path = sys.argv[1], sys.argv[2]
with open(settings_path) as f:
    settings = json.load(f)
hooks = settings.setdefault("hooks", {})
stop_hooks = hooks.setdefault("Stop", [])
cmd = f"python3 {script_path}"
if not any(cmd in str(h) for h in stop_hooks):
    stop_hooks.append({"matcher": "", "hooks": [{"type": "command", "command": cmd, "async": True}]})
with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
print("Hook registered.")
PYEOF

echo "Done! Claude will now sync your usage stats after every session."
echo "Run 'python3 $SYNC_SCRIPT' to sync manually."
`

  return new Response(script, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="install.sh"',
    },
  })
}
