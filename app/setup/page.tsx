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
        {/* Install command */}
        {commands ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Quick install</p>
              <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
                <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{commands.quickInstallCommand}</code>
                <CopyButton text={commands.quickInstallCommand} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Inspect before running</p>
              <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
                <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{commands.inspectInstallCommand}</code>
                <CopyButton text={commands.inspectInstallCommand} />
              </div>
            </div>

            <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted)]">
              Run the quick install on the machine you want tracked. It will install, upgrade, or repair automatically.
            </div>

            <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-muted)]">
              <p>
                The installer attempts the first sync immediately. After that, you can use{' '}
                <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py --doctor</code>{' '}
                or <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py --dry-run</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-surface-2)] rounded-[16px] p-4 text-sm text-[var(--color-muted)]">
            Could not prepare your install command right now. Please refresh and try again.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            Need rollout visibility? View it on{' '}
            <a href="/admin/leaderboard" className="text-[var(--color-text)] underline underline-offset-2">
              /admin/leaderboard
            </a>.
          </p>
        </div>
      </SetupModal>
    </div>
  )
}
