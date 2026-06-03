const INSPECT_INSTALLER_PATH = '/tmp/claude-leaderboard-install.sh'

function escapeForDoubleQuotes(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function getInstallScriptUrl(appUrl: string, installToken: string): string {
  return `${appUrl}/api/install/${installToken}`
}

export function buildInstallCommands(appUrl: string, installToken: string) {
  const scriptUrl = getInstallScriptUrl(appUrl, installToken)

  return {
    quickInstallCommand: `curl -fsSL ${scriptUrl} | bash`,
    inspectInstallCommand: `curl -fsSL ${scriptUrl} -o ${INSPECT_INSTALLER_PATH} && bash ${INSPECT_INSTALLER_PATH}`,
  }
}

export function buildInstallBootstrapScript(appUrl: string, installToken: string): string {
  const escapedAppUrl = escapeForDoubleQuotes(appUrl)
  const escapedToken = escapeForDoubleQuotes(installToken)

  return `#!/usr/bin/env bash
set -euo pipefail

APP_URL="${escapedAppUrl}"
INSTALL_TOKEN="${escapedToken}"
CLAUDE_DIR="\${HOME}/.claude"
SYNC_SCRIPT="\${CLAUDE_DIR}/sync.py"
CONFIG_FILE="\${CLAUDE_DIR}/sync_config.json"
SETTINGS_FILE="\${CLAUDE_DIR}/settings.json"
CRON_SYNC_WRAPPER="\${CLAUDE_DIR}/sync-cron.sh"
MACOS_LAUNCH_AGENT_LABEL="com.claude-leaderboard.sync"
MACOS_LAUNCH_AGENT_DIR="\${HOME}/Library/LaunchAgents"
MACOS_LAUNCH_AGENT_FILE="\${MACOS_LAUNCH_AGENT_DIR}/\${MACOS_LAUNCH_AGENT_LABEL}.plist"
LINUX_SYSTEMD_USER_DIR="\${HOME}/.config/systemd/user"
LINUX_SYSTEMD_SERVICE_NAME="claude-leaderboard-sync.service"
LINUX_SYSTEMD_TIMER_NAME="claude-leaderboard-sync.timer"
LINUX_SYSTEMD_SERVICE_FILE="\${LINUX_SYSTEMD_USER_DIR}/\${LINUX_SYSTEMD_SERVICE_NAME}"
LINUX_SYSTEMD_TIMER_FILE="\${LINUX_SYSTEMD_USER_DIR}/\${LINUX_SYSTEMD_TIMER_NAME}"
CRON_SYNC_TAG="claude-leaderboard-sync"
TMP_DIR="$(mktemp -d "\${TMPDIR:-/tmp}/claude-leaderboard.XXXXXX")"
TMP_SYNC_SCRIPT="\${TMP_DIR}/sync.py"
TMP_CONFIG_FILE="\${TMP_DIR}/sync_config.json"
TMP_SETTINGS_FILE="\${TMP_DIR}/settings.json"
EXCHANGE_JSON="\${TMP_DIR}/exchange.json"
BACKUP_SUFFIX="$(date +%Y%m%d%H%M%S)"
SETTINGS_BACKUP=""
INSTALL_MODE="fresh install"
SETTINGS_STATE="missing"
HOOK_STATUS="pending"
PLATFORM="unknown"
SCHEDULER_MODE="pending"
IS_TTY=0
if [ -t 1 ]; then
  IS_TTY=1
fi

cleanup() {
  rm -rf "\${TMP_DIR}"
}
trap cleanup EXIT

if [ "\${IS_TTY}" -eq 1 ]; then
  COLOR_RESET=$'\\033[0m'
  COLOR_DIM=$'\\033[2m'
  COLOR_BLUE=$'\\033[38;5;39m'
  COLOR_GREEN=$'\\033[38;5;78m'
  COLOR_YELLOW=$'\\033[38;5;221m'
  COLOR_RED=$'\\033[38;5;203m'
else
  COLOR_RESET=""
  COLOR_DIM=""
  COLOR_BLUE=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
fi

section() {
  printf "\\n%s==>%s %s\\n" "\${COLOR_BLUE}" "\${COLOR_RESET}" "$1"
}

note() {
  printf "%s[info]%s %s\\n" "\${COLOR_DIM}" "\${COLOR_RESET}" "$1"
}

ok() {
  printf "%s[ok]%s %s\\n" "\${COLOR_GREEN}" "\${COLOR_RESET}" "$1"
}

warn() {
  printf "%s[warn]%s %s\\n" "\${COLOR_YELLOW}" "\${COLOR_RESET}" "$1"
}

fail() {
  printf "%s[fail]%s %s\\n" "\${COLOR_RED}" "\${COLOR_RESET}" "$1" >&2
  exit 1
}

spin_until_done() {
  local pid="$1"
  local label="$2"
  local frames='|/-\\\\'
  local i=0
  while kill -0 "\${pid}" 2>/dev/null; do
    local frame="\${frames:i%4:1}"
    printf "\\r%s[%s]%s %s" "\${COLOR_BLUE}" "\${frame}" "\${COLOR_RESET}" "\${label}"
    i=$((i + 1))
    sleep 0.1
  done
  wait "\${pid}"
}

run_step() {
  local label="$1"
  shift
  local log_file="\${TMP_DIR}/step.log"
  : > "\${log_file}"

  if [ "\${IS_TTY}" -eq 1 ]; then
    "$@" >"\${log_file}" 2>&1 &
    local pid=$!
    if spin_until_done "\${pid}" "\${label}"; then
      printf "\\r%-80s\\r" " "
      ok "\${label}"
      return 0
    fi
    local status=$?
    printf "\\r%-80s\\r" " "
    warn "\${label}"
    cat "\${log_file}" >&2
    return "\${status}"
  fi

  note "\${label}"
  if "$@" >"\${log_file}" 2>&1; then
    ok "\${label}"
    return 0
  fi

  cat "\${log_file}" >&2
  return 1
}

detect_hook_status() {
  if [ ! -f "\${SETTINGS_FILE}" ]; then
    return 1
  fi

  python3 - "\${SETTINGS_FILE}" "\${SYNC_SCRIPT}" <<'PYEOF'
import json
import sys
from pathlib import Path

settings_path = Path(sys.argv[1])
script_path = str(Path(sys.argv[2]))
with settings_path.open(encoding="utf-8") as handle:
    settings = json.load(handle)
hooks = settings.get("hooks", {})
stop_hooks = hooks.get("Stop", [])
command = f"python3 {script_path}"
found = False
for entry in stop_hooks:
    for hook in entry.get("hooks", []):
        if hook.get("type") == "command" and hook.get("command") == command:
            found = True
            break
    if found:
        break
raise SystemExit(0 if found else 1)
PYEOF
}

detect_scheduler_status() {
  case "\${PLATFORM}" in
    darwin)
      [ -f "\${MACOS_LAUNCH_AGENT_FILE}" ]
      ;;
    linux-systemd)
      [ -f "\${LINUX_SYSTEMD_SERVICE_FILE}" ] && [ -f "\${LINUX_SYSTEMD_TIMER_FILE}" ]
      ;;
    linux-cron)
      [ -f "\${CRON_SYNC_WRAPPER}" ] && crontab -l 2>/dev/null | grep -Fq "\${CRON_SYNC_TAG}"
      ;;
    *)
      return 1
      ;;
  esac
}

preflight() {
  section "Preflight"

  command -v bash >/dev/null 2>&1 || fail "bash is required"
  ok "bash available"
  command -v curl >/dev/null 2>&1 || fail "curl is required"
  ok "curl available"
  command -v python3 >/dev/null 2>&1 || fail "python3 is required"
  ok "python3 available"

  local uname_value
  uname_value="$(uname -s 2>/dev/null || true)"
  case "\${uname_value}" in
    Darwin)
      PLATFORM="darwin"
      ;;
    Linux)
      if command -v systemctl >/dev/null 2>&1; then
        PLATFORM="linux-systemd"
      elif command -v crontab >/dev/null 2>&1; then
        PLATFORM="linux-cron"
      else
        fail "Linux installs require systemctl --user or crontab for automatic Codex capture"
      fi
      ;;
    *)
      fail "Automatic Claude + Codex capture is currently supported on macOS and Linux"
      ;;
  esac
  ok "Scheduler platform detected: \${PLATFORM}"

  mkdir -p "\${CLAUDE_DIR}"
  local probe="\${CLAUDE_DIR}/.write-probe"
  if ! : > "\${probe}"; then
    fail "Could not write inside \${CLAUDE_DIR}"
  fi
  rm -f "\${probe}"
  ok "Claude directory writable at \${CLAUDE_DIR}"

  if [ -f "\${SETTINGS_FILE}" ]; then
    if python3 - "\${SETTINGS_FILE}" <<'PYEOF'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    json.load(handle)
PYEOF
    then
      SETTINGS_STATE="valid"
      ok "Claude settings.json is valid"
    else
      SETTINGS_STATE="malformed"
      warn "Claude settings.json is malformed and will be repaired"
    fi
  else
    ok "Claude settings.json will be created"
  fi

  local has_sync_script=0
  local has_config=0
  local has_hook=0
  local has_scheduler=0
  if [ -f "\${SYNC_SCRIPT}" ]; then
    has_sync_script=1
  fi
  if [ -f "\${CONFIG_FILE}" ]; then
    has_config=1
  fi
  if detect_hook_status; then
    has_hook=1
  fi
  if detect_scheduler_status; then
    has_scheduler=1
  fi

  if [ "\${has_sync_script}" -eq 1 ] && [ "\${has_config}" -eq 1 ] && [ "\${has_hook}" -eq 1 ] && [ "\${has_scheduler}" -eq 1 ] && [ "\${SETTINGS_STATE}" = "valid" ]; then
    INSTALL_MODE="upgrade"
  elif [ "\${has_sync_script}" -eq 1 ] || [ "\${has_config}" -eq 1 ] || [ "\${has_hook}" -eq 1 ] || [ "\${has_scheduler}" -eq 1 ] || [ "\${SETTINGS_STATE}" = "malformed" ]; then
    INSTALL_MODE="repair"
  fi
  ok "Install mode detected: \${INSTALL_MODE}"
}

download_sync_script() {
  curl -fsSL "\${APP_URL}/sync.py" -o "\${TMP_SYNC_SCRIPT}"
  chmod +x "\${TMP_SYNC_SCRIPT}"
}

exchange_install_token() {
  curl -fsSL "\${APP_URL}/api/install/exchange" \\
    -H "Content-Type: application/json" \\
    -X POST \\
    --data "{\\"token\\":\\"\${INSTALL_TOKEN}\\"}" \\
    -o "\${EXCHANGE_JSON}"

  python3 - "\${EXCHANGE_JSON}" "\${TMP_CONFIG_FILE}" <<'PYEOF'
import json
import sys
from pathlib import Path

exchange_path = Path(sys.argv[1])
config_path = Path(sys.argv[2])

with exchange_path.open(encoding="utf-8") as handle:
    payload = json.load(handle)

required = ["syncToken", "apiUrl", "schemaVersion"]
missing = [key for key in required if not payload.get(key)]
if missing:
    raise SystemExit(f"exchange payload missing fields: {', '.join(missing)}")

config = {
    "sync_token": payload["syncToken"],
    "api_url": payload["apiUrl"],
    "schema_version": payload["schemaVersion"],
}

with config_path.open("w", encoding="utf-8") as handle:
    json.dump(config, handle, indent=2)
    handle.write("\\n")
PYEOF
}

prepare_settings() {
  python3 - "\${SETTINGS_FILE}" "\${TMP_SETTINGS_FILE}" "\${SYNC_SCRIPT}" "\${SETTINGS_STATE}" <<'PYEOF'
import json
import sys
from pathlib import Path

settings_path = Path(sys.argv[1])
tmp_settings_path = Path(sys.argv[2])
script_path = sys.argv[3]
settings_state = sys.argv[4]

if settings_state == "valid" and settings_path.exists():
    with settings_path.open(encoding="utf-8") as handle:
        settings = json.load(handle)
else:
    settings = {}

hooks = settings.setdefault("hooks", {})
stop_hooks = hooks.setdefault("Stop", [])
command = f"python3 {script_path}"
entry = {"matcher": "", "hooks": [{"type": "command", "command": command, "async": True}]}

found = False
for existing in stop_hooks:
    for hook in existing.get("hooks", []):
        if hook.get("type") == "command" and hook.get("command") == command:
            found = True
            break
    if found:
        break

if not found:
    stop_hooks.append(entry)

with tmp_settings_path.open("w", encoding="utf-8") as handle:
    json.dump(settings, handle, indent=2)
    handle.write("\\n")

print("existing" if found else "refreshed")
PYEOF
}

commit_install() {
  if [ -f "\${SETTINGS_FILE}" ]; then
    SETTINGS_BACKUP="\${SETTINGS_FILE}.bak.\${BACKUP_SUFFIX}"
    cp "\${SETTINGS_FILE}" "\${SETTINGS_BACKUP}"
  fi

  mv "\${TMP_SYNC_SCRIPT}" "\${SYNC_SCRIPT}"
  mv "\${TMP_CONFIG_FILE}" "\${CONFIG_FILE}"
  mv "\${TMP_SETTINGS_FILE}" "\${SETTINGS_FILE}"
}

install_scheduler() {
  case "\${PLATFORM}" in
    darwin)
      SCHEDULER_MODE="launchd"
      mkdir -p "\${MACOS_LAUNCH_AGENT_DIR}"
      cat > "\${MACOS_LAUNCH_AGENT_FILE}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>\${MACOS_LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>python3</string>
    <string>\${SYNC_SCRIPT}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>600</integer>
  <key>StandardOutPath</key>
  <string>\${CLAUDE_DIR}/scheduler.log</string>
  <key>StandardErrorPath</key>
  <string>\${CLAUDE_DIR}/scheduler.log</string>
</dict>
</plist>
EOF
      launchctl unload "\${MACOS_LAUNCH_AGENT_FILE}" >/dev/null 2>&1 || true
      launchctl load -w "\${MACOS_LAUNCH_AGENT_FILE}"
      ;;
    linux-systemd)
      SCHEDULER_MODE="systemd"
      mkdir -p "\${LINUX_SYSTEMD_USER_DIR}"
      cat > "\${LINUX_SYSTEMD_SERVICE_FILE}" <<EOF
[Unit]
Description=Claude Leaderboard background sync

[Service]
Type=oneshot
ExecStart=/usr/bin/env python3 \${SYNC_SCRIPT}
EOF
      cat > "\${LINUX_SYSTEMD_TIMER_FILE}" <<EOF
[Unit]
Description=Run Claude Leaderboard background sync every 10 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Unit=\${LINUX_SYSTEMD_SERVICE_NAME}

[Install]
WantedBy=timers.target
EOF
      systemctl --user daemon-reload
      systemctl --user enable --now "\${LINUX_SYSTEMD_TIMER_NAME}"
      ;;
    linux-cron)
      SCHEDULER_MODE="cron"
      cat > "\${CRON_SYNC_WRAPPER}" <<EOF
#!/usr/bin/env bash
python3 "\${SYNC_SCRIPT}" >/dev/null 2>&1 || true
EOF
      chmod +x "\${CRON_SYNC_WRAPPER}"
      local cron_tmp="\${TMP_DIR}/crontab"
      { crontab -l 2>/dev/null || true; } | grep -Fv "\${CRON_SYNC_TAG}" > "\${cron_tmp}" || true
      printf '*/10 * * * * "%s" # %s\n' "\${CRON_SYNC_WRAPPER}" "\${CRON_SYNC_TAG}" >> "\${cron_tmp}"
      crontab "\${cron_tmp}"
      ;;
    *)
      fail "Unsupported scheduler platform: \${PLATFORM}"
      ;;
  esac
}

verify_install() {
  python3 "\${SYNC_SCRIPT}" --health-check
}

print_summary() {
  local version
  version="$(python3 "\${SYNC_SCRIPT}" --version)"
  section "Summary"
  ok "Claude Leaderboard \${INSTALL_MODE} complete"
  note "Version: \${version}"
  note "Files:"
  note "  - \${SYNC_SCRIPT}"
  note "  - \${CONFIG_FILE}"
  note "  - \${SETTINGS_FILE}"
  note "Claude hook: installed"
  note "Background scheduler: \${SCHEDULER_MODE}"
  if [ -n "\${SETTINGS_BACKUP}" ]; then
    note "Backup: \${SETTINGS_BACKUP}"
  fi
  printf "\\n%sNext:%s run %spython3 ~/.claude/sync.py%s whenever you want an immediate manual sync.\\n" "\${COLOR_BLUE}" "\${COLOR_RESET}" "\${COLOR_GREEN}" "\${COLOR_RESET}"
}

section "Claude Leaderboard installer"
note "This installer will preflight your machine, update the shared Claude + Codex collector, refresh the Claude Stop hook, install background sync, and verify the result."

preflight
run_step "Downloading sync.py" download_sync_script || fail "Could not download sync.py"
run_step "Exchanging install token" exchange_install_token || fail "Could not exchange install token"
run_step "Preparing Claude settings hook" prepare_settings || fail "Could not prepare Claude settings"
run_step "Writing files atomically" commit_install || fail "Could not write installer files"
run_step "Installing background sync scheduler" install_scheduler || fail "Could not install background sync scheduler"
run_step "Running local health check" verify_install || fail "Install finished writing files, but local verification failed"
print_summary
`
}
