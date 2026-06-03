'use client'

import Image from 'next/image'
import StatCard from './StatCard'
import type { InsightPeriod, TeamInsights } from '@/lib/insights'

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 100_000) return `${Math.round(n / 1_000)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtPercent(value: number | null) {
  if (value == null) return 'New period'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function formatPeriodLabel(period: InsightPeriod) {
  if (period === '7d') return 'Last 7 days'
  if (period === '30d') return 'Last 30 days'
  return 'All time'
}

function shortModelName(model: string) {
  return model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  return (
    <div className="avatar-ring rank-default" style={{ padding: '2px' }}>
      <div className="game-avatar w-9 h-9">
        {image ? (
          <Image src={image} alt={name} width={36} height={36} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-extrabold"
            style={{ background: 'var(--color-accent)', color: '#0f0f13' }}
          >
            {name[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>
    </div>
  )
}

function TrendDelta({ insights }: { insights: TeamInsights }) {
  if (insights.period === 'all' || !insights.momentum.delta) {
    return <span className="text-xs text-[var(--color-muted)] font-bold">Lifetime totals</span>
  }

  const { absolute, percentage } = insights.momentum.delta
  const tone =
    absolute > 0
      ? 'text-[var(--color-accent-border)]'
      : absolute < 0
        ? 'text-[var(--color-red)]'
        : 'text-[var(--color-muted)]'

  return (
    <span className={`text-xs font-bold ${tone}`}>
      {fmtPercent(percentage)} vs previous window
    </span>
  )
}

function TeamSnapshotCards({ insights }: { insights: TeamInsights }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Instance Tokens" value={fmtCompact(insights.snapshot.totalTokens)} sub={formatPeriodLabel(insights.period)} />
      <StatCard label="Active Users" value={insights.snapshot.activeUsers} sub="With activity in period" />
      <StatCard label="Sessions" value={fmtCompact(insights.snapshot.totalSessions)} sub="Total synced sessions" />
      <StatCard label="Avg Active Days" value={insights.snapshot.averageActiveDays.toFixed(1)} sub="Per active member" />
    </div>
  )
}

function TeamTrendCard({ insights }: { insights: TeamInsights }) {
  const max = Math.max(...insights.momentum.series.map((point) => point.tokens), 1)

  return (
    <div className="game-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Momentum</p>
          <p className="text-lg text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {fmtCompact(insights.momentum.totalTokens)} tokens
          </p>
        </div>
        <TrendDelta insights={insights} />
      </div>

      {insights.momentum.series.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          No activity yet for this period.
        </div>
      ) : (
        <div className="rounded-[16px] bg-[var(--color-surface-2)] border border-[var(--color-border)]/10 px-3 pt-4 pb-3">
          <div className="flex items-end gap-1 h-28">
            {insights.momentum.series.map((point, index) => {
              const height = point.tokens > 0 ? Math.max(10, Math.round((point.tokens / max) * 100)) : 6
              return (
                <div
                  key={point.date}
                  className="flex-1 rounded-t-md bg-[var(--color-accent)]/80 border border-[var(--color-accent-border)]/20"
                  style={{
                    height: `${height}%`,
                    opacity: 0.55 + (index / Math.max(insights.momentum.series.length, 1)) * 0.45,
                  }}
                  title={`${point.date}: ${point.tokens.toLocaleString()} tokens`}
                />
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
            <span>{insights.momentum.series[0]?.date ?? '—'}</span>
            <span>{insights.momentum.series[insights.momentum.series.length - 1]?.date ?? '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceBreakdownCard({ insights }: { insights: TeamInsights }) {
  return (
    <div className="game-card p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Source Mix</p>
        <p className="text-sm text-[var(--color-muted)] font-bold">
          {fmtCompact(insights.sourceBreakdown.totalTokens)} tokens across {fmtCompact(insights.sourceBreakdown.totalEvents)} events
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {insights.sourceBreakdown.items.map((item, index) => (
          <div key={item.source} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-bold text-[var(--color-text)]">{item.label}</span>
              <span className="text-[var(--color-muted)] font-bold">{item.percentage.toFixed(1)}%</span>
            </div>
            <div className="game-progress-track h-4">
              <div
                className={`game-progress-fill ${index === 0 ? 'bg-[var(--color-accent-2)]' : 'bg-[var(--color-accent)]'}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <div className="text-[11px] text-[var(--color-muted)] font-bold">
              {fmtCompact(item.tokens)} tokens • {fmtCompact(item.events)} events
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopModelsCard({ insights }: { insights: TeamInsights }) {
  return (
    <div className="game-card p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Top Models</p>
        <p className="text-sm text-[var(--color-muted)] font-bold">Ranked by event count</p>
      </div>
      {insights.topModels.length === 0 ? (
        <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          No model data yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {insights.topModels.map((model, index) => (
            <div key={model.model} className="flex items-center gap-2 text-sm">
              <span className="w-28 truncate text-[var(--color-muted)] font-bold" title={model.model}>
                {shortModelName(model.model)}
              </span>
              <div className="game-progress-track flex-1 h-4">
                <div
                  className={`game-progress-fill ${index % 2 === 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-accent-2)]'}`}
                  style={{ width: `${model.percentage}%` }}
                />
              </div>
              <span className="w-12 text-right text-[var(--color-muted)] font-bold tabular-nums">
                {model.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StandoutCard({
  label,
  name,
  image,
  primary,
  secondary,
}: {
  label: string
  name: string
  image: string | null
  primary: string
  secondary: string
}) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)]/10 bg-[var(--color-surface-2)] px-4 py-3 flex items-center gap-3">
      <Avatar name={name} image={image} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">{label}</p>
        <p className="font-bold text-[var(--color-text)] truncate">{name}</p>
        <p className="text-xs text-[var(--color-muted)] font-bold">{primary}</p>
        <p className="text-[11px] text-[var(--color-muted)]">{secondary}</p>
      </div>
    </div>
  )
}

function StandoutsCard({ insights }: { insights: TeamInsights }) {
  const { mostActive, biggestRiser, longestCurrentStreak } = insights.standouts

  return (
    <div className="game-card p-4 flex flex-col gap-3">
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Standouts</p>
        <p className="text-sm text-[var(--color-muted)] font-bold">More signal than just leaderboard rank</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {mostActive ? (
          <StandoutCard
            label="Most Active"
            name={mostActive.name}
            image={mostActive.image}
            primary={`${fmtCompact(mostActive.tokens)} tokens`}
            secondary={formatPeriodLabel(insights.period)}
          />
        ) : (
          <div className="rounded-[20px] border border-[var(--color-border)]/10 bg-[var(--color-surface-2)] px-4 py-5 text-sm text-[var(--color-muted)]">
            No activity yet for this period.
          </div>
        )}

        {biggestRiser ? (
          <StandoutCard
            label="Biggest Riser"
            name={biggestRiser.name}
            image={biggestRiser.image}
            primary={`+${fmtCompact(biggestRiser.deltaTokens)} tokens`}
            secondary={`${fmtCompact(biggestRiser.previousTokens)} -> ${fmtCompact(biggestRiser.currentTokens)}`}
          />
        ) : (
          <div className="rounded-[20px] border border-[var(--color-border)]/10 bg-[var(--color-surface-2)] px-4 py-5 text-sm text-[var(--color-muted)]">
            {insights.period === 'all' ? 'Available in 7d and 30d views.' : 'No positive rise yet.'}
          </div>
        )}

        {longestCurrentStreak ? (
          <StandoutCard
            label="Longest Current Streak"
            name={longestCurrentStreak.name}
            image={longestCurrentStreak.image}
            primary={`${longestCurrentStreak.currentStreak} day streak`}
            secondary="Computed from live daily activity"
          />
        ) : (
          <div className="rounded-[20px] border border-[var(--color-border)]/10 bg-[var(--color-surface-2)] px-4 py-5 text-sm text-[var(--color-muted)]">
            No live streaks yet.
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamInsightsSection({
  data,
  period,
  loading,
  errorMessage,
}: {
  data: TeamInsights | null
  period: InsightPeriod
  loading: boolean
  errorMessage: string | null
}) {
  const insights = data

  return (
    <section className="game-card p-5 flex flex-col gap-4 relative z-10 mt-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2
            className="text-xl text-[var(--color-text)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Team Insights
          </h2>
          <span className="text-xs text-[var(--color-muted)] font-bold uppercase tracking-wider">
            {formatPeriodLabel(period)}
          </span>
        </div>
        <p className="text-sm text-[var(--color-muted)] font-bold">
          Instance-wide activity, momentum, source mix, and standout members in one view.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-[16px] border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
          Insights could not be refreshed right now. {errorMessage}
        </div>
      )}

      {!insights && loading ? (
        <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          Loading instance analytics...
        </div>
      ) : !insights ? (
        <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          Insights are not available right now.
        </div>
      ) : (
        <>
          <TeamSnapshotCards insights={insights} />
          <div className="grid gap-3 lg:grid-cols-3">
            <TeamTrendCard insights={insights} />
            <SourceBreakdownCard insights={insights} />
            <TopModelsCard insights={insights} />
          </div>
          <StandoutsCard insights={insights} />
        </>
      )}
    </section>
  )
}
