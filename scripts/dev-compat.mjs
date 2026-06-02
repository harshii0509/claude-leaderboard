#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const MIN_NODE_MAJOR = 20
const MIN_NODE_MINOR = 9
const FALLBACK_NODE_CANDIDATES = [
  process.env.CLAUDE_LEADERBOARD_NODE,
  process.env.NVM_BIN ? path.join(process.env.NVM_BIN, 'node') : null,
  '/opt/homebrew/bin/node',
  '/usr/local/bin/node',
  '/Users/harshii/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node',
].filter(Boolean)

function parseNodeVersion(version) {
  const normalized = version.startsWith('v') ? version.slice(1) : version
  const [major = '0', minor = '0', patch = '0'] = normalized.split('.')
  return {
    major: Number.parseInt(major, 10) || 0,
    minor: Number.parseInt(minor, 10) || 0,
    patch: Number.parseInt(patch, 10) || 0,
  }
}

function isSupportedNode(version) {
  const parsed = parseNodeVersion(version)
  if (parsed.major > MIN_NODE_MAJOR) return true
  if (parsed.major < MIN_NODE_MAJOR) return false
  return parsed.minor >= MIN_NODE_MINOR
}

function uniqueExistingPaths(paths) {
  return [...new Set(paths)].filter((candidate) => candidate && fs.existsSync(candidate))
}

function spawnForOutput(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let stdout = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.on('close', (code) => {
      resolve({ code, stdout: stdout.trim() })
    })
  })
}

async function findCompatibleNode() {
  const candidates = uniqueExistingPaths(FALLBACK_NODE_CANDIDATES)

  for (const candidate of candidates) {
    const result = await spawnForOutput(candidate, ['-p', 'process.version'], process.env)
    if (result.code === 0 && isSupportedNode(result.stdout)) {
      return candidate
    }
  }

  return null
}

function launchNextWith(nodePath) {
  const wasmDir = path.join(process.cwd(), 'node_modules', '@next', 'swc-wasm-nodejs')
  if (!fs.existsSync(wasmDir)) {
    console.error('[dev:compat] Missing node_modules/@next/swc-wasm-nodejs. Run `npm install` first.')
    process.exit(1)
  }

  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!fs.existsSync(nextBin)) {
    console.error('[dev:compat] Missing local Next.js CLI at node_modules/next/dist/bin/next. Run `npm install` first.')
    process.exit(1)
  }

  const nodeDir = path.dirname(nodePath)
  const child = spawn(nodePath, [nextBin, 'dev', '--webpack', ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${nodeDir}${path.delimiter}${process.env.PATH ?? ''}`,
      NEXT_TEST_WASM: '1',
      NEXT_TEST_WASM_DIR: wasmDir,
    },
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
}

async function main() {
  if (isSupportedNode(process.version)) {
    launchNextWith(process.execPath)
    return
  }

  const compatibleNode = await findCompatibleNode()
  if (!compatibleNode) {
    console.error(
      `[dev:compat] Next.js 16 needs Node >=${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0. ` +
        `Current runtime is ${process.version}, and no compatible fallback Node was found.`,
    )
    console.error(
      '[dev:compat] Install or activate a newer Node runtime, or point CLAUDE_LEADERBOARD_NODE at a Node 20.9+ binary.',
    )
    process.exit(1)
  }

  console.warn(`[dev:compat] Current runtime ${process.version} is too old. Re-launching with ${compatibleNode}.`)
  launchNextWith(compatibleNode)
}

await main()
