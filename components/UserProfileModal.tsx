'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import ActivityHeatmap from './ActivityHeatmap'
import { LeaderboardEntry } from './Podium'

interface UserProfileModalProps {
  entry: LeaderboardEntry
  rank: number
  onClose: () => void
}

interface DayData {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  messages: number
  sessions: number
}

interface ModelEntry {
  model: string
  count: number
}

const RING_CLASS: Record<number, string> = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' }

const RANK_BADGE: Record<number, { bg: string; border: string; color: string }> = {
  1: { bg: '#f5c842', border: '#b8900a', color: '#5a3c00' },
  2: { bg: '#c8d4e0', border: '#7a90a8', color: '#2a3a4a' },
  3: { bg: '#c8844a', border: '#8b5a2b', color: '#fff' },
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function relTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function UserProfileModal({ entry, rank, onClose }: UserProfileModalProps) {
  const [activity, setActivity] = useState<DayData[]>([])
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loading, setLoading] = useState(true)

  const ringClass = RING_CLASS[rank] ?? 'rank-default'
  const badge = RANK_BADGE[rank]

  useEffect(() => {
    async function load() {
      try {
        const [actRes, statsRes] = await Promise.all([
          fetch(`/api/activity/${entry.user_id}`),
          fetch(`/api/user-stats/${entry.user_id}`),
        ])
        if (actRes.ok) setActivity(await actRes.json())
        if (statsRes.ok) {
          const s = await statsRes.json()
          const mu = s.models_used ?? {}
          setModels(
            Object.entries(mu)
              .map(([model, count]) => ({ model, count: count as number }))
              .sort((a, b) => b.count - a.count)
          )
        }
      } catch {
        // network error — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entry.user_id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bestDay = activity.reduce<{ date: string; tokens: number } | null>((best, d) => {
    const t = d.input_tokens + d.output_tokens + (d.cache_creation_input_tokens ?? 0) + (d.cache_read_input_tokens ?? 0)
    if (!best || t > best.tokens) return { date: d.date, tokens: t }
    return best
  }, null)

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1
  const totalTokens = entry.total_tokens || 1

  const tokenBreakdown = [
    { label: 'Input', value: entry.total_input_tokens, color: 'var(--color-accent-2)' },
    { label: 'Output', value: entry.total_output_tokens, color: 'var(--color-accent)' },
    {
      label: 'Cache',
      value: entry.total_cache_creation_input_tokens + entry.total_cache_read_input_tokens,
      color: 'var(--color-gold)',
    },
  ]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="backdrop-in absolute inset-0 bg-[var(--color-border)]/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="modal-pop game-card relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-[var(--color-border)]/15">
          <div className={`avatar-ring ${ringClass}`} style={{ padding: '3px' }}>
            <div className="game-avatar w-14 h-14">
              {entry.image ? (
                <Image
                  src={entry.image}
                  alt={entry.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xl font-extrabold"
                  style={{ background: 'var(--color-accent)', color: '#0f0f13' }}
                >
                  {entry.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-xl font-semibold text-[var(--color-text)] truncate">
                {entry.name}
              </span>
              {badge ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold rank-pulse"
                  style={{
                    background: badge.bg,
                    border: `2px solid ${badge.border}`,
                    color: badge.color,
                    boxShadow: `0 2px 0 -1px ${badge.border}`,
                  }}
                >
                  {rank}
                </span>
              ) : (
                <span className="text-sm text-[var(--color-muted)] font-bold">#{rank}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-muted)] font-bold flex-wrap">
              <span>Synced {relTime(entry.last_synced_at)}</span>
              {bestDay && bestDay.tokens > 0 && (
                <span className="before:content-['·'] before:mr-2">Best day {fmt(bestDay.tokens)} tokens</span>
              )}
            </div>
          </div>

          <button
            className="game-btn-icon w-8 h-8 flex-shrink-0 text-sm text-[var(--color-muted)]"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]/15 border-b border-[var(--color-border)]/15">
          {[
            { label: 'Tokens', value: fmt(entry.total_tokens) },
            { label: 'Messages', value: fmt(entry.total_messages) },
            { label: 'Sessions', value: String(entry.total_sessions) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-4 gap-0.5">
              <span className="font-display text-2xl font-semibold text-[var(--color-text)]">{value}</span>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">{label}</span>
            </div>
          ))}
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Token breakdown */}
          <div>
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-3 font-bold">Token breakdown</p>
            <div className="flex flex-col gap-2.5">
              {tokenBreakdown.map(({ label, value, color }, i) => {
                const pct = Math.round((value / totalTokens) * 100)
                return (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="w-12 text-[var(--color-muted)] font-bold">{label}</span>
                    <div className="game-progress-track flex-1 h-4">
                      <div
                        className="game-progress-fill model-bar"
                        style={{ width: `${pct}%`, background: color, '--bar-index': i } as React.CSSProperties}
                      />
                    </div>
                    <span className="w-16 text-right text-[var(--color-muted)] tabular-nums font-bold">{fmt(value)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Streak cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="game-card px-4 py-4 flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-semibold text-[var(--color-gold)]">
                <span className="streak-fire">🔥</span> {entry.current_streak}d
              </span>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Current streak</span>
            </div>
            <div className="game-card px-4 py-4 flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-semibold text-[var(--color-accent-2)]">
                🏆 {entry.longest_streak}d
              </span>
              <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Best streak</span>
            </div>
          </div>

          {/* Lazy-loaded details */}
          {loading ? (
            <div className="text-sm text-[var(--color-muted)] font-bold animate-pulse py-2">Loading details...</div>
          ) : (
            <>
              {models.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-3 font-bold">Models used</p>
                  <div className="flex flex-col gap-2">
                    {models.slice(0, 5).map((m, index) => {
                      const pct = Math.round((m.count / totalModelCount) * 100)
                      const shortName = m.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
                      return (
                        <div key={m.model} className="flex items-center gap-2 text-sm">
                          <span className="w-32 truncate text-[var(--color-muted)] font-bold" title={m.model}>
                            {shortName}
                          </span>
                          <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-2 overflow-hidden">
                            <div
                              className="model-bar bg-[var(--color-accent)] h-2 rounded-full"
                              style={{ width: `${pct}%`, '--bar-index': index } as React.CSSProperties}
                            />
                          </div>
                          <span className="w-8 text-right text-[var(--color-muted)] tabular-nums font-bold">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-3 font-bold">
                  Activity (90 days)
                </p>
                <ActivityHeatmap activity={activity} days={90} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
