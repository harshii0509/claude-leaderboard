import { supabaseAdmin } from '@/lib/db'
import Image from 'next/image'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import ProfileShareButton from '@/components/ProfileShareButton'
import DeleteAccountButton from './DeleteAccountButton'
import { computeStreaks } from '@/lib/leaderboard-math'
import { canCurrentUserSelfDelete, requireActiveSession } from '@/lib/access'

async function getUserStats(userId: string) {
  const { data: stats } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  const { data: activity } = await supabaseAdmin
    .from('daily_activity')
    .select('date, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  const allActivity = activity ?? []
  const streaks = computeStreaks(allActivity.map((row) => row.date))

  return {
    stats: stats
      ? {
          ...stats,
          current_streak: streaks.current,
          longest_streak: Math.max(stats.longest_streak ?? 0, streaks.longest),
        }
      : stats,
    activity: allActivity.slice(-365),
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never synced'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 60) return `Last synced ${minutes <= 1 ? 'just now' : `${minutes} minutes ago`}`
  if (hours < 24) return `Last synced ${hours} hour${hours === 1 ? '' : 's'} ago`
  return `Last synced ${days} day${days === 1 ? '' : 's'} ago`
}

function syncStatus(iso: string | null): 'green' | 'yellow' | 'red' {
  if (!iso) return 'red'
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (days < 1) return 'green'
  if (days < 7) return 'yellow'
  return 'red'
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default async function ProfilePage() {
  const [{ session, membership }, allowSelfDelete] = await Promise.all([
    requireActiveSession(),
    canCurrentUserSelfDelete(),
  ])

  const { stats, activity } = await getUserStats(session.user.id)

  const models: Array<{ model: string; count: number }> = stats?.models_used
    ? Object.entries(stats.models_used)
        .map(([model, count]) => ({ model, count: count as number }))
        .sort((a, b) => b.count - a.count)
    : []

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1

  const status = syncStatus(stats?.last_synced_at ?? null)
  const syncLabel = relativeTime(stats?.last_synced_at ?? null)

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Background texture */}
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

      {/* Header */}
      <header className="relative z-10 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
            ← Leaderboard
          </Link>
          <Link href="/setup" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
            Setup
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 pt-2 pb-12 flex flex-col gap-5">
        {/* User card */}
        <div className="game-card p-6 flex items-center gap-5">
          <div className="avatar-ring rank-default flex-shrink-0">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ''}
                width={64}
                height={64}
                className="game-avatar"
              />
            ) : (
              <div className="game-avatar w-16 h-16 bg-[var(--color-accent)] flex items-center justify-center text-2xl font-bold text-white">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1
              className="text-2xl text-[var(--color-text)] leading-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              {session.user.name}
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">{session.user.email}</p>

            {/* Sync status chip */}
            {status === 'red' ? (
              <Link
                href="/setup"
                className="game-btn-red text-xs px-3 py-1 text-white font-bold mt-2"
                style={{ borderRadius: '12px', boxShadow: '0px 3px 0px -1px #6B1E25' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 mr-1.5 inline-block flex-shrink-0" />
                {!stats?.last_synced_at ? 'Never synced — set up sync' : syncLabel}
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 mt-2 text-xs px-3 py-1 text-white font-bold"
                style={
                  status === 'green'
                    ? { background: '#22c55e', border: '2px solid #15803d', borderRadius: '12px', boxShadow: '0px 3px 0px -1px #15803d' }
                    : { background: '#eab308', border: '2px solid #a16207', borderRadius: '12px', boxShadow: '0px 3px 0px -1px #a16207' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                {syncLabel}
              </span>
            )}
          </div>
          <div className="ml-auto self-start">
            <ProfileShareButton />
          </div>
        </div>

        {/* Stats grid */}
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total tokens"
              value={fmt(
                (stats.total_input_tokens ?? 0) +
                (stats.total_output_tokens ?? 0) +
                (stats.total_cache_creation_input_tokens ?? 0) +
                (stats.total_cache_read_input_tokens ?? 0)
              )}
            />
            <StatCard label="Messages" value={fmt(stats.total_messages ?? 0)} />
            <StatCard
              label="Streak"
              value={stats.current_streak > 0 ? `${stats.current_streak}d` : '—'}
              sub={stats.longest_streak > 0 ? `Best: ${stats.longest_streak}d` : undefined}
            />
            <StatCard label="Sessions" value={stats.total_sessions ?? 0} />
          </div>
        ) : (
          <div className="game-card p-6 text-center">
            <p className="text-[var(--color-muted)] mb-3">No stats yet.</p>
            <Link href="/setup" className="game-btn text-sm px-4 py-2 text-black font-bold">
              Set up the sync hook →
            </Link>
          </div>
        )}

        {/* Heatmap */}
        <div className="game-card p-5">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold mb-4">Activity</p>
          <ActivityHeatmap activity={activity} />
        </div>

        {/* Model breakdown */}
        {models.length > 0 && (
          <div className="game-card p-5">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold mb-4">Models used</p>
            <div className="flex flex-col gap-3">
              {models.map((m) => {
                const pct = Math.round((m.count / totalModelCount) * 100)
                const shortName = m.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
                return (
                  <div key={m.model} className="flex items-center gap-3 text-sm">
                    <span className="w-36 truncate text-[var(--color-muted)]" title={m.model}>{shortName}</span>
                    <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-2">
                      <div className="bg-[var(--color-accent)] h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-[var(--color-muted)]">{pct}%</span>
                    <span className="w-16 text-right text-[var(--color-text)] font-mono">{fmt(m.count)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Data & Privacy */}
        <div className="game-card p-5">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold mb-4">Data &amp; Privacy</p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-[var(--color-text)] font-semibold mb-1">Uninstall the sync hook</p>
              <ol className="list-decimal list-inside text-sm text-[var(--color-muted)] space-y-1">
                <li>Remove the Stop hook entry for <code className="text-xs bg-[var(--color-surface-2)] px-1 py-0.5 rounded">sync_config.json</code> from <code className="text-xs bg-[var(--color-surface-2)] px-1 py-0.5 rounded">~/.claude/settings.json</code></li>
                <li>Delete <code className="text-xs bg-[var(--color-surface-2)] px-1 py-0.5 rounded">~/.claude/sync_config.json</code></li>
              </ol>
            </div>
            <div className="border-t border-[var(--color-surface-2)] pt-4">
              <p className="text-sm text-[var(--color-text)] font-semibold mb-1">Delete account</p>
              {allowSelfDelete ? (
                <>
                  <p className="text-sm text-[var(--color-muted)] mb-3">Permanently deletes all your stored data — stats, activity, and account.</p>
                  <DeleteAccountButton />
                </>
              ) : (
                <p className="text-sm text-[var(--color-muted)]">
                  {membership.role === 'owner' || membership.role === 'admin'
                    ? 'Privileged accounts must be removed or transferred from the admin panel first.'
                    : 'Account deletion is not available right now.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
