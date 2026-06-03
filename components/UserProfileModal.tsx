'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import ActivityHeatmap from './ActivityHeatmap'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'

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
  const [activity, setActivity] = useState<DayData[]>([])
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const shouldReduce = useReducedMotion() ?? false

  const ringClass = RING_CLASS[rank] ?? 'rank-default'
  const badge = RANK_BADGE[rank]

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [actRes, statsRes] = await Promise.all([
          fetch(`/api/activity/${entry.user_id}`),
          fetch(`/api/user-stats/${entry.user_id}`),
        ])
        const activityPayload = await actRes.json()
        const statsPayload = await statsRes.json()

        if (!actRes.ok) {
          throw new Error(
            activityPayload && typeof activityPayload.error === 'string'
              ? activityPayload.error
              : 'Failed to load activity'
          )
        }

        if (!statsRes.ok) {
          throw new Error(
            statsPayload && typeof statsPayload.error === 'string'
              ? statsPayload.error
              : 'Failed to load profile stats'
          )
        }

        setActivity(activityPayload)
        const mu = statsPayload.models_used ?? {}
        setModels(
          Object.entries(mu)
            .map(([model, count]) => ({ model, count: count as number }))
            .sort((a, b) => b.count - a.count)
        )
        setLoadError(null)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load this profile right now.')
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

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1
  const totalTokens = entry.total_tokens || 1

  const tokenBreakdown = [
    { label: 'Input',  value: entry.total_input_tokens,  color: 'var(--color-accent-2)' },
    { label: 'Output', value: entry.total_output_tokens, color: 'var(--color-accent)' },
    {
      label: 'Cache',
      value: entry.total_cache_creation_input_tokens + entry.total_cache_read_input_tokens,
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
            {loadError && (
              <div className="mb-3 rounded-[12px] border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 px-3 py-2 text-xs text-[var(--color-text)]">
                {loadError}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {tokenBreakdown.map(({ label, value, color }, i) => {
                const pct = Math.round((value / totalTokens) * 100)
                return (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-[var(--color-muted)] font-bold">{label}</span>
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

          {/* Lazy-loaded: models + heatmap */}
          {loading ? (
            <div className="w-full text-sm text-[var(--color-muted)] font-bold animate-pulse py-2">Loading details...</div>
          ) : (
            <>
              {models.length > 0 && (
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
                              style={{ width: `${pct}%`, '--bar-index': index } as React.CSSProperties}
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
