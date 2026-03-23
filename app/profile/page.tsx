import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/db'
import Image from 'next/image'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import ActivityHeatmap from '@/components/ActivityHeatmap'

async function getUserStats(userId: string) {
  const { data: stats } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const { data: activity } = await supabaseAdmin
    .from('daily_activity')
    .select('date, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, messages, sessions')
    .eq('user_id', userId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true })

  return { stats, activity: activity ?? [] }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const { stats, activity } = await getUserStats(session.user.id)

  const models: Array<{ model: string; count: number }> = stats?.models_used
    ? Object.entries(stats.models_used)
        .map(([model, count]) => ({ model, count: count as number }))
        .sort((a, b) => b.count - a.count)
    : []

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            ← Leaderboard
          </Link>
          <Link href="/setup" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            Setup
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* User header */}
        <div className="flex items-center gap-4">
          {session.user.image ? (
            <Image src={session.user.image} alt={session.user.name ?? ''} width={64} height={64} className="rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-2xl font-bold text-white">
              {session.user.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{session.user.name}</h1>
            <p className="text-sm text-[var(--color-muted)]">{session.user.email}</p>
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
              value={stats.current_streak > 0 ? `🔥 ${stats.current_streak}d` : '—'}
              sub={stats.longest_streak > 0 ? `Best: ${stats.longest_streak}d` : undefined}
            />
            <StatCard label="Sessions" value={stats.total_sessions ?? 0} />
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
            <p className="text-[var(--color-muted)] mb-2">No stats yet.</p>
            <Link href="/setup" className="text-[var(--color-accent)] text-sm hover:underline">
              Set up the sync hook →
            </Link>
          </div>
        )}

        {/* Heatmap */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-4">Activity (90 days)</p>
          <ActivityHeatmap activity={activity} days={90} />
        </div>

        {/* Model breakdown */}
        {models.length > 0 && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-4">Models used</p>
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
      </main>
    </div>
  )
}
