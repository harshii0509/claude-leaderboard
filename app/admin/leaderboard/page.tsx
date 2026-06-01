import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLeaderboardSyncStatus } from '@/lib/leaderboard-admin'

function formatSyncTime(value: string | null) {
  if (!value) return 'Never'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function LeaderboardAdminPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const status = await getLeaderboardSyncStatus()
  const completion = status.total_users > 0
    ? Math.round((status.users_with_raw_events / status.total_users) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('/bg.png')`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          opacity: 0.5,
          mixBlendMode: 'overlay',
          zIndex: 0,
        }}
      />

      <header className="relative z-10 py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl text-white tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Leaderboard Migration Status
            </h1>
            <p className="text-xs text-white/65 mt-0.5 font-bold">
              Track who has repopulated fresh raw usage history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
              Leaderboard
            </Link>
            <Link href="/setup" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
              Setup
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-12 flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="game-card p-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Sync Generation</p>
            <p className="mt-2 text-3xl text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {status.sync_generation}
            </p>
          </div>
          <div className="game-card p-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Users Refilled</p>
            <p className="mt-2 text-3xl text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {status.users_with_raw_events}/{status.total_users}
            </p>
          </div>
          <div className="game-card p-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Still Need Sync</p>
            <p className="mt-2 text-3xl text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {status.users_without_raw_events}
            </p>
          </div>
          <div className="game-card p-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Migration Progress</p>
            <p className="mt-2 text-3xl text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {completion}%
            </p>
          </div>
        </div>

        <div className="game-card p-5 flex flex-col gap-3">
          <p className="text-sm text-[var(--color-text)] font-semibold">Recommended next step</p>
          <p className="text-sm text-[var(--color-muted)]">
            Ask everyone in the list below to run <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py</code> once,
            or rerun the Setup command. Their normal Stop hook will continue working after that.
          </p>
        </div>

        <div className="game-card p-5 overflow-x-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Users pending refill</p>
            <p className="text-xs text-[var(--color-muted)] font-bold">{status.needs_sync.length} users</p>
          </div>

          {status.needs_sync.length === 0 ? (
            <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              Everyone has repopulated raw history for the current generation.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-muted)] uppercase tracking-wider text-xs">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Last Sync</th>
                  <th className="pb-3">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {status.needs_sync.map((user) => (
                  <tr key={user.user_id} className="border-t border-[var(--color-border)]/15 text-[var(--color-text)]">
                    <td className="py-3 pr-4 font-semibold">{user.name ?? 'Unknown user'}</td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{user.email ?? 'No email'}</td>
                    <td className="py-3 pr-4 text-[var(--color-muted)]">{formatSyncTime(user.last_synced_at)}</td>
                    <td className="py-3 text-[var(--color-muted)]">{user.last_activity_date ?? 'No activity'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
