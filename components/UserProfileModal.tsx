'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { clientQueryKeys, fetchApiJson } from '@/lib/client-query'
import ActivityHeatmap from './ActivityHeatmap'
import { LeaderboardEntry } from './Podium'
import {
  getUsageModelLabel,
  getUsageProviderLabel,
  getUsageSourceLabel,
  type UsageBreakdown,
  type UsageBreakdownModel,
  type UsageBreakdownProvider,
  type UsageBreakdownSource,
} from '@/lib/usage-breakdown-shared'

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

interface UserStatsPayload {
  models_used?: Record<string, number> | null
  usage_breakdown?: UsageBreakdown | null
}

interface UserProfileDetail {
  activity: DayData[]
  models: ModelEntry[]
  usageBreakdown: UsageBreakdown | null
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

const statsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}

const statsItem = {
  hidden: { scale: 0.82, y: 12, opacity: 0 },
  show: (reduce: boolean) => ({
    scale: 1,
    y: 0,
    opacity: 1,
    transition: reduce
      ? { duration: 0 }
      : { type: 'spring' as const, duration: 0.4, bounce: 0.4 },
  }),
}

export default function UserProfileModal({ entry, rank, onClose }: UserProfileModalProps) {
  const shouldReduce = useReducedMotion() ?? false

  const ringClass = RING_CLASS[rank] ?? 'rank-default'
  const badge = RANK_BADGE[rank]
  const profileQuery = useQuery<UserProfileDetail>({
    queryKey: clientQueryKeys.userProfile(entry.user_id),
    queryFn: async () => {
      const [activityPayload, statsPayload] = await Promise.all([
        fetchApiJson<DayData[]>(`/api/activity/${entry.user_id}`, 'Failed to load activity'),
        fetchApiJson<UserStatsPayload>(`/api/user-stats/${entry.user_id}`, 'Failed to load profile stats'),
      ])
      const models = Object.entries(statsPayload.models_used ?? {})
        .map(([model, count]) => ({ model, count: count as number }))
        .sort((a, b) => b.count - a.count)

      return {
        activity: activityPayload ?? [],
        models,
        usageBreakdown: statsPayload.usage_breakdown ?? null,
      }
    },
  })

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const activity = profileQuery.data?.activity ?? []
  const models = profileQuery.data?.models ?? []
  const usageBreakdown = profileQuery.data?.usageBreakdown ?? null
  const loading = profileQuery.isPending
  const loadError = profileQuery.error instanceof Error ? profileQuery.error.message : null
  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1
  const totalTokens = entry.total_tokens || 1

  const tokenBreakdown = [
    { label: 'Non-cached input', value: entry.total_input_tokens, color: 'var(--color-accent-2)' },
    { label: 'Output', value: entry.total_output_tokens, color: 'var(--color-accent)' },
    {
      label: 'Cache write',
      value: entry.total_cache_creation_input_tokens,
      color: 'var(--color-gold)',
    },
    {
      label: 'Cache read',
      value: entry.total_cache_read_input_tokens,
      color: 'var(--color-gold)',
    },
  ]

  const backdropTransition = shouldReduce ? { duration: 0 } : { duration: 0.2 }
  const modalTransition = shouldReduce
    ? { duration: 0 }
    : { type: 'spring' as const, duration: 0.45, bounce: 0.35 }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={backdropTransition}
        className="absolute inset-0 bg-[var(--color-border)]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.82, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={modalTransition}
        className="game-card relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* ── Header — pinned, never scrolls ─────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-[var(--color-border)]/15">
          <span className="font-display text-lg font-semibold text-[var(--color-text)]">User Profile</span>
          <button
            className="game-btn-icon w-8 h-8 text-sm text-[var(--color-muted)]"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable content ───────────────────── */}
        <div className="game-scrollbar flex-1 overflow-y-auto px-5 pt-5 pb-6 flex flex-col items-center gap-4">

          {/* Avatar */}
          <div className={`avatar-ring ${ringClass}`} style={{ padding: '3px' }}>
            <div className="game-avatar w-20 h-20">
              {entry.image ? (
                <Image
                  src={entry.image}
                  alt={entry.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
                  style={{ background: 'var(--color-accent)', color: '#0f0f13' }}
                >
                  {entry.name[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Name + rank badge + sync time */}
          <div className="text-center w-full min-w-0">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-display text-xl font-semibold text-[var(--color-text)] truncate">
                {entry.name}
              </span>
              {badge ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-extrabold rank-pulse shrink-0"
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
                <span className="text-sm text-[var(--color-muted)] font-bold shrink-0">#{rank}</span>
              )}
            </div>
            <div className="text-xs text-[var(--color-muted)] font-bold mt-1">
              Synced {relTime(entry.last_synced_at)}
            </div>
          </div>

          {/* Key stats grid — spring stagger */}
          <motion.div
            variants={statsContainer}
            initial="hidden"
            animate="show"
            className="w-full grid grid-cols-3 gap-2"
          >
            {[
              { label: 'Tokens',   value: fmt(entry.total_tokens) },
              { label: 'Messages', value: fmt(entry.total_messages) },
              { label: 'Sessions', value: String(entry.total_sessions) },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                variants={statsItem}
                custom={shouldReduce}
                className="game-card p-3 flex flex-col items-center gap-0.5"
              >
                <span className="font-display text-lg font-semibold text-[var(--color-text)]">{value}</span>
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">{label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Streak mini-cards */}
          <div className="w-full grid grid-cols-2 gap-2">
            <div className="game-card p-3 flex flex-col items-center gap-0.5">
              <span className="font-display text-lg font-semibold text-[var(--color-gold)]">
                <span className="streak-fire">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                    <path d="M6 0C6 0 9 4 9 7a3 3 0 01-6 0c0-1.5 1-3 1-3S5 5.5 5 7a1 1 0 002 0C7 5 6 0 6 0z" fill="#F5A623"/>
                  </svg>
                </span>{' '}{entry.current_streak}d
              </span>
              <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Current Streak</span>
            </div>
            <div className="game-card p-3 flex flex-col items-center gap-0.5">
              <span className="font-display text-lg font-semibold text-[var(--color-accent-2)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}>
                  <path d="M7 9.5C4.5 9.5 2.5 7.5 2.5 5V2h9v3c0 2.5-2 4.5-4.5 4.5z" fill="currentColor"/>
                  <rect x="5.5" y="9.5" width="3" height="1.5" fill="currentColor"/>
                  <rect x="4" y="11" width="6" height="1" rx="0.5" fill="currentColor"/>
                  <path d="M2.5 2H1v2a2 2 0 002 2" stroke="currentColor" strokeWidth="1" fill="none"/>
                  <path d="M11.5 2H13v2a2 2 0 01-2 2" stroke="currentColor" strokeWidth="1" fill="none"/>
                </svg>{entry.longest_streak}d
              </span>
              <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">Best Streak</span>
            </div>
          </div>

          {/* Token breakdown */}
          <div className="w-full border-t border-[var(--color-border)]/15 pt-4">
            <p className="text-xs text-[var(--color-muted)] mb-3 font-bold">Token breakdown</p>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              Non-cached input excludes prompt cache hits. Cache-heavy Claude sessions can legitimately make input and output look small next to cache write and cache read.
            </p>
            {loadError && (
              <div className="mb-3 rounded-[12px] border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 px-3 py-2 text-xs text-[var(--color-text)]">
                {loadError}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {tokenBreakdown.map(({ label, value, color }, i) => {
                const pct = value > 0
                  ? Math.max(2, Math.round((value / totalTokens) * 100))
                  : 0
                return (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="w-28 text-[var(--color-muted)] font-bold">{label}</span>
                    <div className="game-progress-track flex-1 h-4">
                      <div
                        className="game-progress-fill model-bar"
                        style={{ width: `${pct}%`, background: color, '--bar-index': i } as CSSProperties}
                      />
                    </div>
                    <span className="w-16 text-right text-[var(--color-muted)] tabular-nums font-bold">{fmt(value)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lazy-loaded: models + heatmap */}
          {loading ? (
            <div className="w-full text-sm text-[var(--color-muted)] font-bold animate-pulse py-2">Loading details...</div>
          ) : (
            <>
              {usageBreakdown?.sources?.length ? (
                <div className="w-full border-t border-[var(--color-border)]/15 pt-4">
                  <p className="text-xs text-[var(--color-muted)] mb-3 font-bold">Usage breakdown</p>
                  <div className="flex flex-col gap-3">
                    {usageBreakdown.sources.map((source: UsageBreakdownSource) => (
                      <div key={source.source} className="rounded-[14px] border border-[var(--color-border)]/15 bg-[var(--color-surface-2)]/50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text)]">{getUsageSourceLabel(source.source)}</p>
                            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                              {fmt(source.total_sessions)} sessions • {fmt(source.total_events)} events
                            </p>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-[var(--color-text)]">
                            {fmt(source.total_tokens)}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {source.providers.map((provider: UsageBreakdownProvider) => (
                            <div key={`${source.source}:${provider.provider}`} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                                  {getUsageProviderLabel(provider.provider)}
                                </span>
                                <span className="text-[10px] font-bold tabular-nums text-[var(--color-muted)]">
                                  {fmt(provider.total_tokens)}
                                </span>
                              </div>
                              {provider.models.slice(0, 3).map((model: UsageBreakdownModel, index: number) => {
                                const pct = source.total_tokens > 0
                                  ? Math.max(2, Math.round((model.total_tokens / source.total_tokens) * 100))
                                  : 0
                                return (
                                  <div key={`${source.source}:${provider.provider}:${model.model}`} className="flex items-center gap-2 text-sm">
                                    <span className="w-24 truncate text-[var(--color-muted)] font-bold" title={model.model}>
                                      {getUsageModelLabel(model.model)}
                                    </span>
                                    <div className="game-progress-track flex-1 h-4">
                                      <div
                                        className="game-progress-fill model-bar bg-[var(--color-accent)]"
                                        style={{ width: `${pct}%`, '--bar-index': index } as CSSProperties}
                                      />
                                    </div>
                                    <span className="w-16 text-right text-[var(--color-muted)] tabular-nums font-bold">{pct}%</span>
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : models.length > 0 && (
                <div className="w-full border-t border-[var(--color-border)]/15 pt-4">
                  <p className="text-xs text-[var(--color-muted)] mb-3 font-bold">Models used</p>
                  <div className="flex flex-col gap-2">
                    {models.slice(0, 5).map((m, index) => {
                      const pct = Math.round((m.count / totalModelCount) * 100)
                      const shortName = m.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
                      return (
                        <div key={m.model} className="flex items-center gap-2 text-sm">
                          <span className="w-24 truncate text-[var(--color-muted)] font-bold" title={m.model}>
                            {shortName}
                          </span>
                          <div className="game-progress-track flex-1 h-4">
                            <div
                              className="game-progress-fill model-bar bg-[var(--color-accent)]"
                              style={{ width: `${pct}%`, '--bar-index': index } as CSSProperties}
                            />
                          </div>
                          <span className="w-16 text-right text-[var(--color-muted)] tabular-nums font-bold">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="w-full border-t border-[var(--color-border)]/15 pt-4">
                <p className="text-xs text-[var(--color-muted)] mb-3 font-bold">
                  Activity
                </p>
                <ActivityHeatmap activity={activity} />
              </div>
            </>
          )}

        </div>
      </motion.div>
    </div>,
    document.body
  )
}
