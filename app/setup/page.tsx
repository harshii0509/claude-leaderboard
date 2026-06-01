import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { issueInstallToken } from '@/lib/sync-auth'
import CopyButton from './CopyButton'
import SetupModal from './SetupModal'

export default async function SetupPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const headerStore = await headers()
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const forwardedHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const requestOrigin = forwardedHost ? `${forwardedProto ?? 'https'}://${forwardedHost}` : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin ?? 'http://localhost:3000'
  let token: string | null = null

  try {
    token = await issueInstallToken(session.user.id)
  } catch (error) {
    console.error('[setup] failed to issue install token', error)
  }

  const installCmd = token ? `curl -fsSL ${appUrl}/api/install/${token} | bash` : null

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
          It will automatically sync your Claude usage after every Claude session, and it will include local Codex usage if Codex is installed too.
        </p>

        {/* Install command */}
        {installCmd ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Install command</p>
            <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
              <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{installCmd}</code>
              <CopyButton text={installCmd} />
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
            <li>Downloads <code className="text-[var(--color-text)] font-mono">sync.py</code> to <code className="text-[var(--color-text)] font-mono">~/.claude/</code></li>
            <li>Exchanges a short-lived install token for your personal sync credential and writes it to <code className="text-[var(--color-text)] font-mono">~/.claude/sync_config.json</code></li>
            <li>Registers a <strong className="text-[var(--color-text)]">Stop hook</strong> in <code className="text-[var(--color-text)] font-mono">~/.claude/settings.json</code></li>
          </ol>
          <p className="text-sm text-[var(--color-muted)]">
            After installation, Claude will run <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py</code> automatically at the end of every session.
            The same script also reads Codex usage from <code className="text-[var(--color-text)] font-mono">~/.codex/logs_2.sqlite</code> when present, and you can run it manually at any time.
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
