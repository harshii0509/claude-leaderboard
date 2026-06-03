'use client'

import type { LeaderboardEntry, TeamQuest, WeeklyHighlight, WeeklySeasonSummary } from '@/lib/leaderboard-types'

interface WeeklySeasonPanelProps {
  season: WeeklySeasonSummary
  entries: LeaderboardEntry[]
}

function questPercent(quest: TeamQuest) {
  if (quest.target <= 0) return 0
  return Math.min(100, Math.round((quest.progress / quest.target) * 100))
}

function toneClasses(tone: WeeklyHighlight['tone']) {
  if (tone === 'gold') return 'bg-[var(--color-gold)]/20 border-[var(--color-gold-border)]/35'
  if (tone === 'green') return 'bg-[var(--color-accent)]/18 border-[var(--color-accent-border)]/30'
  if (tone === 'purple') return 'bg-[var(--color-accent-2)]/14 border-[var(--color-accent-2)]/30'
  return 'bg-sky-400/12 border-sky-700/20'
}

function crownName(season: WeeklySeasonSummary) {
  if (season.crown_name) return season.crown_name
  return 'No crown yet'
}

export default function WeeklySeasonPanel({ season, entries }: WeeklySeasonPanelProps) {
  const topScore = entries[0]?.weekly_score ?? 0

  return (
    <div className="flex flex-col gap-4">
      <section className="game-card card-enter p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-muted)]">Weekly Season</p>
              <h2
                className="text-3xl leading-none text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                This week is the main board
              </h2>
              <p className="max-w-2xl text-sm font-bold text-[var(--color-muted)]">
                Friendly competition, visible momentum, and a few ways to win before Monday reset.
              </p>
            </div>
            <div className="rounded-[18px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-right shadow-[0_4px_0_-2px_var(--color-border)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">Season Window</p>
              <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{season.label}</p>
              <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">Resets in {season.resets_in_days} day{season.resets_in_days === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
            <div className="rounded-[22px] border-2 border-[var(--color-gold-border)] bg-[linear-gradient(180deg,rgba(245,200,66,0.26),rgba(241,245,250,0.92))] p-4 shadow-[0_5px_0_-2px_var(--color-gold-border)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-gold-border)]">Weekly Crown</p>
              <p
                className="mt-2 text-2xl text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {crownName(season)}
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--color-text)]">
                Weekly Score {topScore}
              </p>
              <p className="mt-3 text-xs font-bold text-[var(--color-muted)]">
                Active days, session rhythm, and meaningful usage all count. One giant spike is not enough.
              </p>
            </div>

            <div className="rounded-[18px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_4px_0_-2px_var(--color-border)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">Active Roster</p>
              <p
                className="mt-2 text-3xl text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {season.active_members}/{season.total_members}
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">Members with activity this week</p>
            </div>

            <div className="rounded-[18px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_4px_0_-2px_var(--color-border)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">Combined Active Days</p>
              <p
                className="mt-2 text-3xl text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {season.total_active_days}
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">Shared momentum across the team</p>
            </div>

            <div className="rounded-[18px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_4px_0_-2px_var(--color-border)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">All-Time Stays</p>
              <p
                className="mt-2 text-3xl text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Live
              </p>
              <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">Flip to All time anytime for legacy status</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="game-card card-enter p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">Weekly Wrap</p>
              <h3
                className="mt-1 text-2xl text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                More than one way to win
              </h3>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {season.highlights.map((highlight) => (
              <article
                key={highlight.id}
                className={`rounded-[18px] border-2 p-4 shadow-[0_4px_0_-2px_rgba(34,38,53,0.2)] ${toneClasses(highlight.tone)}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">{highlight.title}</p>
                <p
                  className="mt-2 text-xl text-[var(--color-text)]"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  {highlight.label}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-text)]">{highlight.detail}</p>
              </article>
            ))}
            {season.highlights.length === 0 && (
              <div className="rounded-[18px] border-2 border-dashed border-[var(--color-border)]/25 bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm font-bold text-[var(--color-muted)]">
                Highlights will light up once the first sessions land this week.
              </div>
            )}
          </div>
        </div>

        <div className="game-card card-enter p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">Team Quests</p>
          <h3
            className="mt-1 text-2xl text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Shared wins
          </h3>
          <div className="mt-4 flex flex-col gap-3">
            {season.quests.map((quest) => {
              const percent = questPercent(quest)

              return (
                <article key={quest.id} className="rounded-[18px] border-2 border-[var(--color-border)]/10 bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--color-text)]">{quest.title}</p>
                      <p className="mt-1 text-xs font-bold text-[var(--color-muted)]">{quest.detail}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[var(--color-text)]">
                      {Math.min(quest.progress, quest.target)}/{quest.target}
                    </p>
                  </div>
                  <div className="game-progress-track mt-3 h-3">
                    <div
                      className="game-progress-fill bg-[linear-gradient(90deg,var(--color-accent),var(--color-gold))]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
