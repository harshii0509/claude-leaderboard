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
  handler: (baseUrl: string, state: { exchangeCount: number; syncScript: string }) => Promise<void> | void,
) {
  const syncScript = await readFile(path.join(process.cwd(), 'public/sync.py'), 'utf8')
  const state = { exchangeCount: 0, syncScript }

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
