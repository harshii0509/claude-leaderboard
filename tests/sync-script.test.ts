import test from 'node:test'
import assert from 'node:assert/strict'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

async function createTempHome() {
  return mkdtemp(path.join(tmpdir(), 'claude-leaderboard-sync-home-'))
}

async function runCommand(command: string, args: string[], options: {
  cwd: string
  env: NodeJS.ProcessEnv
}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

async function createFakeSystemctlBin(homeDir: string) {
  const binDir = await mkdtemp(path.join(tmpdir(), 'claude-leaderboard-systemctl-'))
  const systemctlPath = path.join(binDir, 'systemctl')

  await writeFile(
    systemctlPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = "--user" ]; then
  shift
fi
STATE_FILE="$HOME/.claude/systemd-enabled"
mkdir -p "$(dirname "$STATE_FILE")"
case "$1" in
  is-enabled|is-active)
    if [ -f "$STATE_FILE" ]; then
      exit 0
    fi
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`,
    'utf8',
  )

  await chmod(systemctlPath, 0o755)

  return {
    binDir,
    env: {
      ...process.env,
      HOME: homeDir,
      PATH: `${binDir}:${process.env.PATH ?? ''}`,
    },
  }
}

async function installSchedulerArtifacts(homeDir: string) {
  if (process.platform === 'darwin') {
    const launchAgentDir = path.join(homeDir, 'Library', 'LaunchAgents')
    await mkdir(launchAgentDir, { recursive: true })
    await writeFile(
      path.join(launchAgentDir, 'com.claude-leaderboard.sync.plist'),
      '<plist version="1.0"></plist>\n',
      'utf8',
    )
    return { env: { ...process.env, HOME: homeDir }, cleanup: async () => {} }
  }

  if (process.platform === 'linux') {
    const systemdDir = path.join(homeDir, '.config', 'systemd', 'user')
    const claudeDir = path.join(homeDir, '.claude')
    await mkdir(systemdDir, { recursive: true })
    await mkdir(claudeDir, { recursive: true })
    await writeFile(path.join(systemdDir, 'claude-leaderboard-sync.service'), '[Service]\nExecStart=/usr/bin/env python3 ~/.claude/sync.py\n', 'utf8')
    await writeFile(path.join(systemdDir, 'claude-leaderboard-sync.timer'), '[Timer]\nOnUnitActiveSec=10min\n', 'utf8')
    await writeFile(path.join(claudeDir, 'systemd-enabled'), '', 'utf8')
    const tools = await createFakeSystemctlBin(homeDir)
    return {
      env: tools.env,
      cleanup: async () => rm(tools.binDir, { recursive: true, force: true }),
    }
  }

  throw new Error(`Unsupported test platform: ${process.platform}`)
}

async function createInstalledSyncScript(homeDir: string) {
  const claudeDir = path.join(homeDir, '.claude')
  await mkdir(claudeDir, { recursive: true })
  const installedPath = path.join(claudeDir, 'sync.py')
  await copyFile(path.join(process.cwd(), 'public', 'sync.py'), installedPath)
  await chmod(installedPath, 0o755)
  return installedPath
}

async function writeConfig(homeDir: string, apiUrl: string) {
  await mkdir(path.join(homeDir, '.claude'), { recursive: true })
  await writeFile(
    path.join(homeDir, '.claude', 'sync_config.json'),
    JSON.stringify({
      sync_token: 'sync-token',
      api_url: apiUrl,
      schema_version: 2,
    }, null, 2) + '\n',
    'utf8',
  )
}

async function writeSettings(homeDir: string, scriptPath: string) {
  await writeFile(
    path.join(homeDir, '.claude', 'settings.json'),
    JSON.stringify({
      hooks: {
        Stop: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: `python3 ${scriptPath}`,
                async: true,
              },
            ],
          },
        ],
      },
    }, null, 2) + '\n',
    'utf8',
  )
}

async function createCodexDb(homeDir: string) {
  const codexDir = path.join(homeDir, '.codex')
  const dbPath = path.join(codexDir, 'logs_2.sqlite')
  await mkdir(codexDir, { recursive: true })

  const python = `
import sqlite3
import sys
from pathlib import Path

db_path = Path(sys.argv[1])
conn = sqlite3.connect(db_path)
conn.execute("create table logs (id integer primary key, ts real, ts_nanos integer, target text, feedback_log_body text)")
rows = [
  (1, 1717419000, 0, "opentelemetry_sdk", 'thread.id="thread-1234" turn.id="turn-1234" model="gpt-5-codex" codex.turn.token_usage.input_tokens: 120 codex.turn.token_usage.cached_input_tokens: 30 codex.turn.token_usage.output_tokens: 80 codex.turn.token_usage.reasoning_output_tokens: 10 codex.turn.token_usage.total_tokens: 240 codex.op="end_turn"'),
  (2, 1717419060, 0, "telemetry", 'thread.id="thread-1234" turn.id="turn-1234" model="gpt-5-codex" codex.turn.token_usage.input_tokens: 125 codex.turn.token_usage.cached_input_tokens: 35 codex.turn.token_usage.output_tokens: 82 codex.turn.token_usage.reasoning_output_tokens: 11 codex.turn.token_usage.total_tokens: 253 codex.op="end_turn"'),
  (3, 1717419120, 0, "telemetry", 'thread.id="thread-9999" turn.id="turn-9999" model="gpt-5-codex" codex.turn.token_usage.input_tokens: 90'),
]
conn.executemany("insert into logs (id, ts, ts_nanos, target, feedback_log_body) values (?, ?, ?, ?, ?)", rows)
conn.commit()
conn.close()
`

  const result = await runCommand('python3', ['-c', python, dbPath], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: homeDir },
  })

  assert.equal(result.status, 0, result.stderr)
  return dbPath
}

test('sync.py posts deduped Codex events and exposes Codex diagnostics', async () => {
  const homeDir = await createTempHome()
  const scheduler = await installSchedulerArtifacts(homeDir)
  const scriptPath = await createInstalledSyncScript(homeDir)
  await createCodexDb(homeDir)

  const receivedPayloads: unknown[] = []
  const server = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/sync') {
      let body = ''
      for await (const chunk of req) {
        body += chunk.toString()
      }
      receivedPayloads.push(JSON.parse(body))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, sync_generation: 7 }))
      return
    }

    res.statusCode = 404
    res.end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address()
  assert(address && typeof address === 'object')
  const apiUrl = `http://127.0.0.1:${address.port}/api/sync`

  try {
    await writeConfig(homeDir, apiUrl)
    await writeSettings(homeDir, scriptPath)

    const dryRun = await runCommand('python3', [scriptPath, '--dry-run'], {
      cwd: process.cwd(),
      env: scheduler.env,
    })
    assert.equal(dryRun.status, 0, dryRun.stderr)
    const dryRunSummary = JSON.parse(dryRun.stdout)
    assert.equal(dryRunSummary.codex.db_found, true)
    assert.equal(dryRunSummary.codex.rows_scanned, 3)
    assert.equal(dryRunSummary.codex.events_emitted, 1)
    assert.match(String(dryRunSummary.codex.last_event_timestamp), /2024-/)

    const doctor = await runCommand('python3', [scriptPath, '--doctor'], {
      cwd: process.cwd(),
      env: scheduler.env,
    })
    assert.equal(doctor.status, 0, doctor.stderr)
    assert.match(doctor.stdout, /Codex rows scanned: 3/)
    assert.match(doctor.stdout, /Codex events emitted: 1/)

    const sync = await runCommand('python3', [scriptPath], {
      cwd: process.cwd(),
      env: scheduler.env,
    })
    assert.equal(sync.status, 0, sync.stderr)
    assert.equal(receivedPayloads.length, 1)

    const payload = receivedPayloads[0] as {
      events: Array<{
        event_id: string
        input_tokens: number
        output_tokens: number
        cache_read_input_tokens: number
        stop_reason: string | null
        source: string
        source_path: string | null
      }>
    }

    assert.equal(payload.events.length, 1)
    assert.equal(payload.events[0]?.event_id, 'codex:turn-1234')
    assert.equal(payload.events[0]?.input_tokens, 125)
    assert.equal(payload.events[0]?.output_tokens, 93)
    assert.equal(payload.events[0]?.cache_read_input_tokens, 35)
    assert.equal(payload.events[0]?.stop_reason, 'end_turn')
    assert.equal(payload.events[0]?.source, 'codex')
    assert.match(String(payload.events[0]?.source_path), /logs_2\.sqlite#row-2$/)

    const cache = JSON.parse(await readFile(path.join(homeDir, '.claude', 'sync_cache.json'), 'utf8'))
    assert.equal(cache.sync_generation, 7)
    assert.equal(cache.codex.last_id, 3)
  } finally {
    await scheduler.cleanup()
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await rm(homeDir, { recursive: true, force: true })
  }
})
