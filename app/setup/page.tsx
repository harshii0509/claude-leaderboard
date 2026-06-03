import { headers } from 'next/headers'
import { issueInstallToken } from '@/lib/sync-auth'
import { buildInstallCommands } from '@/lib/install-bootstrap'
import CopyButton from './CopyButton'
import SetupModal from './SetupModal'
import { requireActiveSession } from '@/lib/access'
import { getRequestOriginFromHeaders, resolveAppUrl } from '@/lib/request-context'

export default async function SetupPage() {
  const { session } = await requireActiveSession()

  const headerStore = await headers()
  const appUrl = resolveAppUrl(getRequestOriginFromHeaders(headerStore))
  let token: string | null = null

  try {
    token = await issueInstallToken(session.user.id)
  } catch (error) {
    console.error('[setup] failed to issue install token', error)
  }

  const commands = token ? buildInstallCommands(appUrl, token) : null

  return (
    <div
      className="min-h-screen bg-[var(--color-background)]"
      style={{
        backgroundImage: `url('/bg.png')`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
      }}
    >
      <SetupModal>
        {/* Description */}
        <p className="text-sm text-[var(--color-muted)] leading-relaxed -mt-1">
          Run the one-line command below to install the Claude Stop hook on your machine.
          The installer now preflights your shell, safely upgrades existing installs, and verifies the local setup before it exits.
        </p>

        {/* Install command */}
        {commands ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Quick install</p>
              <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
                <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{commands.quickInstallCommand}</code>
                <CopyButton text={commands.quickInstallCommand} />
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Best for most people. It downloads the bootstrap script, performs local preflight checks, and only then exchanges your short-lived install token.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Inspect before running</p>
              <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
                <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{commands.inspectInstallCommand}</code>
                <CopyButton text={commands.inspectInstallCommand} />
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Use this if you want to inspect the installer on disk before executing it. It is also handy for debugging or support screenshots.
              </p>
            </div>

            <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted)]">
              Existing installs are handled automatically. The installer will detect whether this is a fresh install, upgrade, or repair run and print a summary at the end.
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-surface-2)] rounded-[16px] p-4 text-sm text-[var(--color-muted)]">
            Could not prepare your install command right now. Please try refreshing the page or signing in again.
          </div>
        )}

        {/* What the script does */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">What the script does</p>
          <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-[var(--color-muted)]">
            <li>Preflights your machine for <code className="text-[var(--color-text)] font-mono">bash</code>, <code className="text-[var(--color-text)] font-mono">curl</code>, <code className="text-[var(--color-text)] font-mono">python3</code>, and a writable <code className="text-[var(--color-text)] font-mono">~/.claude/</code></li>
            <li>Downloads <code className="text-[var(--color-text)] font-mono">sync.py</code> and writes config files atomically</li>
            <li>Exchanges a short-lived install token for your personal sync credential only after preflight succeeds</li>
            <li>Backs up and refreshes the Claude <strong className="text-[var(--color-text)]">Stop hook</strong> in <code className="text-[var(--color-text)] font-mono">~/.claude/settings.json</code></li>
            <li>Runs a local health check before it exits</li>
          </ol>
          <p className="text-sm text-[var(--color-muted)]">
            After installation, Claude will run <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py</code> automatically at the end of every session.
            The same script also reads Codex usage from <code className="text-[var(--color-text)] font-mono">~/.codex/logs_2.sqlite</code> when present.
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Need to inspect or troubleshoot the local install later? Use{' '}
            <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py --doctor</code>{' '}
            or validate parsing without uploading with{' '}
            <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py --dry-run</code>.
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Need to track a migration or fresh refill? View the rollout status on{' '}
            <a href="/admin/leaderboard" className="text-[var(--color-text)] underline underline-offset-2">
              /admin/leaderboard
            </a>.
          </p>
        </div>
      </SetupModal>
    </div>
  )
}
