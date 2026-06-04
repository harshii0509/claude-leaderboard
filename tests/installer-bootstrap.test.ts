import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile, chmod, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { buildInstallBootstrapScript, buildInstallCommands } from '../lib/install-bootstrap.ts'

async function createTempHome() {
  return mkdtemp(path.join(tmpdir(), 'claude-leaderboard-home-'))
}

async function runCommand(command: string, args: string[], options: {
  cwd: string
  env: NodeJS.ProcessEnv
  input?: string
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

    if (options.input) {
      child.stdin.write(options.input)
    }
    child.stdin.end()
  })
}

async function withInstallServer(
  handler: (baseUrl: string, state: { exchangeCount: number; syncScript: string; syncPayloads: unknown[] }) => Promise<void> | void,
) {
  const syncScript = await readFile(path.join(process.cwd(), 'public/sync.py'), 'utf8')
  const state = { exchangeCount: 0, syncScript, syncPayloads: [] as unknown[] }

  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 404
      res.end()
      return
    }

    if (req.method === 'GET' && req.url === '/sync.py') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(syncScript)
      return
    }

    if (req.method === 'POST' && req.url === '/api/install/exchange') {
      state.exchangeCount += 1
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        syncToken: `token-${state.exchangeCount}`,
        apiUrl: `${baseUrl}/api/sync`,
        schemaVersion: 2,
      }))
      return
    }

    if (req.method === 'POST' && req.url === '/api/sync') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      await new Promise<void>((resolve) => req.on('end', () => resolve()))
      state.syncPayloads.push(JSON.parse(body || '{}'))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, sync_generation: 2 }))
      return
    }

    res.statusCode = 404
    res.end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address()
  assert(address && typeof address === 'object')
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await handler(baseUrl, state)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

test('buildInstallCommands exposes quick and inspect-first commands', () => {
  const commands = buildInstallCommands('https://example.com', 'install-token')
  assert.equal(commands.quickInstallCommand, 'curl -fsSL https://example.com/api/install/install-token | bash')
  assert.equal(
    commands.inspectInstallCommand,
    'curl -fsSL https://example.com/api/install/install-token -o /tmp/claude-leaderboard-install.sh && bash /tmp/claude-leaderboard-install.sh',
  )
})

test('bootstrap script keeps the short-lived install token instead of embedding a sync token', () => {
  const script = buildInstallBootstrapScript('https://example.com', 'install-token')
  assert.match(script, /INSTALL_TOKEN="install-token"/)
  assert.doesNotMatch(script, /SYNC_TOKEN=/)
  assert.match(script, /api\/install\/exchange/)
})

test('preflight failure does not consume the install token', async () => {
  await withInstallServer(async (baseUrl, state) => {
    const homeDir = await createTempHome()
    const claudeDir = path.join(homeDir, '.claude')

    try {
      await mkdir(claudeDir, { recursive: true })
      await chmod(claudeDir, 0o500)

      const script = buildInstallBootstrapScript(baseUrl, 'install-token')
      const result = await runCommand('bash', ['-s'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
        input: script,
      })

      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /Could not write inside/)
      assert.equal(state.exchangeCount, 0)
    } finally {
      await chmod(claudeDir, 0o700).catch(() => {})
      await rm(homeDir, { recursive: true, force: true })
    }
  })
})

test('inspect-first bootstrap installs, upgrades, and exposes doctor and dry-run flows', async () => {
  await withInstallServer(async (baseUrl) => {
    const homeDir = await createTempHome()
    const scriptFile = path.join(homeDir, 'install.sh')

    try {
      await writeFile(scriptFile, buildInstallBootstrapScript(baseUrl, 'install-token-1'), 'utf8')
      let result = await runCommand('bash', [scriptFile], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })

      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /fresh install complete/)

      const syncScriptPath = path.join(homeDir, '.claude', 'sync.py')
      const configPath = path.join(homeDir, '.claude', 'sync_config.json')
      const settingsPath = path.join(homeDir, '.claude', 'settings.json')
      await stat(syncScriptPath)
      await stat(configPath)
      const settings = JSON.parse(await readFile(settingsPath, 'utf8'))
      assert.equal(settings.hooks.Stop[0].hooks[0].command, `python3 ${syncScriptPath}`)

      result = await runCommand('python3', [syncScriptPath, '--doctor'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /Doctor check passed/)

      const projectDir = path.join(homeDir, '.claude', 'projects', 'demo')
      await mkdir(projectDir, { recursive: true })
      await writeFile(
        path.join(projectDir, 'session.jsonl'),
        `${JSON.stringify({
          type: 'assistant',
          sessionId: 'session-1',
          timestamp: '2026-06-02T10:00:00.000Z',
          message: {
            id: 'msg-1',
            model: 'claude-opus-4',
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 12,
              output_tokens: 8,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
            },
          },
        })}\n`,
        'utf8',
      )

      result = await runCommand('python3', [syncScriptPath, '--dry-run'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)
      const dryRun = JSON.parse(result.stdout)
      assert.equal(dryRun.event_count, 1)
      assert.equal(dryRun.suspicious_claude_usage_events, 0)
      assert.equal(dryRun.zero_token_claude_events, 0)

      await writeFile(scriptFile, buildInstallBootstrapScript(baseUrl, 'install-token-2'), 'utf8')
      result = await runCommand('bash', [scriptFile], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /upgrade complete/)
    } finally {
      await rm(homeDir, { recursive: true, force: true })
    }
  })
})

test('dry-run reports suspicious Claude usage shapes and sync warns without crashing', async () => {
  await withInstallServer(async (baseUrl, state) => {
    const homeDir = await createTempHome()
    const scriptFile = path.join(homeDir, 'install.sh')

    try {
      await writeFile(scriptFile, buildInstallBootstrapScript(baseUrl, 'install-token-suspicious'), 'utf8')
      let result = await runCommand('bash', [scriptFile], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)

      const syncScriptPath = path.join(homeDir, '.claude', 'sync.py')
      const projectDir = path.join(homeDir, '.claude', 'projects', 'demo')
      await mkdir(projectDir, { recursive: true })
      await writeFile(
        path.join(projectDir, 'session.jsonl'),
        `${JSON.stringify({
          type: 'assistant',
          sessionId: 'session-suspicious-1',
          timestamp: '2026-06-02T10:00:00.000Z',
          message: {
            id: 'msg-suspicious-1',
            model: 'claude-opus-4',
            stop_reason: 'end_turn',
            usage: {
              prompt_tokens: 12,
              completion_tokens: 8,
              cache_tokens: 4,
            },
          },
        })}\n`,
        'utf8',
      )

      result = await runCommand('python3', [syncScriptPath, '--dry-run'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)
      const dryRun = JSON.parse(result.stdout)
      assert.equal(dryRun.event_count, 1)
      assert.equal(dryRun.suspicious_claude_usage_events, 1)
      assert.equal(dryRun.zero_token_claude_events, 1)

      result = await runCommand('python3', [syncScriptPath], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stderr, /Warning: detected 1 Claude usage event/)
      assert.equal(state.syncPayloads.length, 2)

      const payload = state.syncPayloads[1] as {
        events?: Array<{
          source: string
          input_tokens: number
          output_tokens: number
          cache_creation_input_tokens: number
          cache_read_input_tokens: number
        }>
      }
      const suspiciousEvent = payload.events?.find((event) => event.source === 'claude')
      assert.deepEqual(
        suspiciousEvent && {
          source: suspiciousEvent.source,
          input_tokens: suspiciousEvent.input_tokens,
          output_tokens: suspiciousEvent.output_tokens,
          cache_creation_input_tokens: suspiciousEvent.cache_creation_input_tokens,
          cache_read_input_tokens: suspiciousEvent.cache_read_input_tokens,
        },
        {
          source: 'claude',
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      )
    } finally {
      await rm(homeDir, { recursive: true, force: true })
    }
  })
})

test('install performs an immediate first sync for existing Claude, Codex, and OpenCode history', async () => {
  await withInstallServer(async (baseUrl, state) => {
    const homeDir = await createTempHome()
    const scriptFile = path.join(homeDir, 'install.sh')
    const claudeProjectDir = path.join(homeDir, '.claude', 'projects', 'demo')
    const codexDir = path.join(homeDir, '.codex')
    const codexDbPath = path.join(codexDir, 'logs_2.sqlite')
    const opencodeDbPath = path.join(homeDir, '.local', 'share', 'opencode', 'opencode.db')

    try {
      await mkdir(claudeProjectDir, { recursive: true })
      await mkdir(codexDir, { recursive: true })
      await mkdir(path.dirname(opencodeDbPath), { recursive: true })
      await writeFile(
        path.join(claudeProjectDir, 'session.jsonl'),
        `${JSON.stringify({
          type: 'assistant',
          sessionId: 'claude-session-1',
          timestamp: '2026-06-03T08:00:00.000Z',
          message: {
            id: 'claude-msg-1',
            model: 'claude-opus-4',
            stop_reason: 'end_turn',
            usage: {
              input_tokens: 120,
              output_tokens: 80,
              cache_creation_input_tokens: 5,
              cache_read_input_tokens: 10,
            },
          },
        })}\n`,
        'utf8',
      )

      const createDb = await runCommand('python3', ['-c', `
import sqlite3, sys
path = sys.argv[1]
conn = sqlite3.connect(path)
conn.execute("""
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  ts_nanos INTEGER NOT NULL,
  level TEXT NOT NULL,
  target TEXT NOT NULL,
  feedback_log_body TEXT,
  module_path TEXT,
  file TEXT,
  line INTEGER,
  thread_id TEXT,
  process_uuid TEXT,
  estimated_bytes INTEGER NOT NULL DEFAULT 0
)
""")
body = 'session_loop{thread_id=019e89df-8fb9-7a62-94fa-356e8a412941}:submission_dispatch{otel.name="op.dispatch.user_input" submission.id="019e89df-943c-7532-8086-45116761efa4" codex.op="user_input"}:turn{otel.name="session_task.turn" thread.id=019e89df-8fb9-7a62-94fa-356e8a412941 turn.id=019e89df-943c-7532-8086-45116761efa4 model=gpt-5.4-mini codex.turn.reasoning_effort=low codex.turn.token_usage.input_tokens=17455 codex.turn.token_usage.cached_input_tokens=1536 codex.turn.token_usage.non_cached_input_tokens=15919 codex.turn.token_usage.output_tokens=61 codex.turn.token_usage.reasoning_output_tokens=40 codex.turn.token_usage.total_tokens=17516}:  name="Metrics.InstrumentCreated" instrument_name="codex.turn.memory" cardinality_limit=2000'
conn.execute("insert into logs (ts, ts_nanos, level, target, feedback_log_body, estimated_bytes) values (?, ?, 'INFO', 'opentelemetry_sdk', ?, 0)", (1748937600, 0, body))
conn.commit()
conn.close()
      `, codexDbPath], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(createDb.status, 0, createDb.stderr)

      const createOpenCodeDb = await runCommand('python3', ['-c', `
import json, sqlite3, sys
path = sys.argv[1]
conn = sqlite3.connect(path)
conn.execute("""
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  model TEXT,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_reasoning INTEGER NOT NULL DEFAULT 0,
  tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  tokens_cache_write INTEGER NOT NULL DEFAULT 0
)
""")
conn.execute(
  "insert into session (id, model, time_created, time_updated, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  (
    "opencode-session-1",
    json.dumps({"id": "claude-sonnet-4", "providerID": "anthropic"}),
    1748937600000,
    1748941200000,
    210,
    90,
    30,
    15,
    6,
  ),
)
conn.commit()
conn.close()
      `, opencodeDbPath], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })
      assert.equal(createOpenCodeDb.status, 0, createOpenCodeDb.stderr)

      await writeFile(scriptFile, buildInstallBootstrapScript(baseUrl, 'install-token-4'), 'utf8')
      const result = await runCommand('bash', [scriptFile], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
      })

      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /Initial sync complete/)
      assert.equal(state.syncPayloads.length, 1)

      const payload = state.syncPayloads[0] as {
        events?: Array<{
          source: string
          model: string
          input_tokens: number
          output_tokens: number
          cache_creation_input_tokens?: number
          cache_read_input_tokens: number
        }>
      }
      assert.ok(payload.events)
      assert.equal(payload.events?.length, 3)

      const claudeEvent = payload.events?.find((event) => event.source === 'claude')
      assert.deepEqual(
        claudeEvent && {
          source: claudeEvent.source,
          model: claudeEvent.model,
          input_tokens: claudeEvent.input_tokens,
          output_tokens: claudeEvent.output_tokens,
          cache_read_input_tokens: claudeEvent.cache_read_input_tokens,
        },
        {
          source: 'claude',
          model: 'claude-opus-4',
          input_tokens: 120,
          output_tokens: 80,
          cache_read_input_tokens: 10,
        },
      )

      const codexEvent = payload.events?.find((event) => event.source === 'codex')
      assert.deepEqual(
        codexEvent && {
          source: codexEvent.source,
          model: codexEvent.model,
          input_tokens: codexEvent.input_tokens,
          output_tokens: codexEvent.output_tokens,
          cache_read_input_tokens: codexEvent.cache_read_input_tokens,
        },
        {
          source: 'codex',
          model: 'gpt-5.4-mini',
          input_tokens: 17455,
          output_tokens: 101,
          cache_read_input_tokens: 1536,
        },
      )

      const opencodeEvent = payload.events?.find((event) => event.source === 'opencode')
      assert.deepEqual(
        opencodeEvent && {
          source: opencodeEvent.source,
          model: opencodeEvent.model,
          input_tokens: opencodeEvent.input_tokens,
          output_tokens: opencodeEvent.output_tokens,
          cache_creation_input_tokens: opencodeEvent.cache_creation_input_tokens,
          cache_read_input_tokens: opencodeEvent.cache_read_input_tokens,
        },
        {
          source: 'opencode',
          model: 'anthropic/claude-sonnet-4',
          input_tokens: 210,
          output_tokens: 120,
          cache_creation_input_tokens: 6,
          cache_read_input_tokens: 15,
        },
      )
    } finally {
      await rm(homeDir, { recursive: true, force: true })
    }
  })
})

test('bootstrap repairs malformed settings and keeps a backup', async () => {
  await withInstallServer(async (baseUrl) => {
    const homeDir = await createTempHome()
    const claudeDir = path.join(homeDir, '.claude')

    try {
      await mkdir(claudeDir, { recursive: true })
      await writeFile(path.join(claudeDir, 'settings.json'), '{broken-json', 'utf8')

      const result = await runCommand('bash', ['-s'], {
        cwd: process.cwd(),
        env: { ...process.env, HOME: homeDir },
        input: buildInstallBootstrapScript(baseUrl, 'install-token-3'),
      })

      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /repair complete/)

      const entries = await readdir(claudeDir)
      assert(entries.some((entry) => entry.startsWith('settings.json.bak.')))
      const settings = JSON.parse(await readFile(path.join(claudeDir, 'settings.json'), 'utf8'))
      assert.ok(settings.hooks.Stop.length > 0)
    } finally {
      await rm(homeDir, { recursive: true, force: true })
    }
  })
})
