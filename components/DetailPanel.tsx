'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import ActivityHeatmap from './ActivityHeatmap'
import { parseApiJsonResponse } from '@/lib/api-json-response'
import {
  getUsageModelLabel,
  getUsageProviderLabel,
  getUsageSourceLabel,
  type UsageBreakdown,
  type UsageBreakdownModel,
  type UsageBreakdownProvider,
  type UsageBreakdownSource,
} from '@/lib/usage-breakdown-shared'

interface DetailPanelProps {
  userId: string
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

export default function DetailPanel({ userId }: DetailPanelProps) {
  const [activity, setActivity] = useState<DayData[]>([])
  const [models, setModels] = useState<ModelEntry[]>([])
  const [usageBreakdown, setUsageBreakdown] = useState<UsageBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [actRes, statsRes] = await Promise.all([
          fetch(`/api/activity/${userId}`),
          fetch(`/api/user-stats/${userId}`),
        ])
        const [{ data: activityPayload, error: activityError }, { data: statsPayload, error: statsError }] = await Promise.all([
          parseApiJsonResponse<DayData[]>(actRes, 'Failed to load activity'),
          parseApiJsonResponse<UserStatsPayload>(statsRes, 'Failed to load profile stats'),
        ])

        if (activityError) throw new Error(activityError)
        if (statsError) throw new Error(statsError)
        if (!statsPayload) throw new Error('Profile stats response was empty.')

        setActivity(activityPayload ?? [])
        if (statsPayload.usage_breakdown?.sources?.length) {
          setUsageBreakdown(statsPayload.usage_breakdown)
          setModels([])
        } else {
          setUsageBreakdown(null)
          const mu = statsPayload.models_used ?? {}
          setModels(
            Object.entries(mu)
              .map(([model, count]) => ({ model, count: count as number }))
              .sort((a, b) => b.count - a.count)
          )
        }
        setLoadError(null)
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load this profile right now.')
        setActivity([])
        setUsageBreakdown(null)
        setModels([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return <div className="py-4 px-6 text-[var(--color-muted)] text-sm font-bold">Loading...</div>
  }

  if (loadError) {
    return (
      <div className="px-6 py-4 bg-[var(--color-surface-2)] border-t border-[var(--color-border)]/15">
        <p className="text-sm font-bold text-[var(--color-red)]">{loadError}</p>
      </div>
    )
  }

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1

  return (
    <div className="px-6 py-4 bg-[var(--color-surface-2)] border-t border-[var(--color-border)]/15 flex flex-col gap-6">
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-2 font-bold">Activity</p>
        <ActivityHeatmap activity={activity} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-2 font-bold">
          {usageBreakdown?.sources?.length ? 'Usage breakdown' : 'Models used'}
        </p>
        {usageBreakdown?.sources?.length ? (
          <div className="flex flex-col gap-3">
            {usageBreakdown.sources.map((source: UsageBreakdownSource) => (
              <div key={source.source} className="rounded-[14px] border border-[var(--color-border)]/15 bg-[var(--color-background)]/35 px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text)]">{getUsageSourceLabel(source.source)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      {source.total_sessions} sessions
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[var(--color-text)] tabular-nums">{source.total_tokens}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {source.providers.map((provider: UsageBreakdownProvider) => (
                    <div key={`${source.source}:${provider.provider}`} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
                          {getUsageProviderLabel(provider.provider)}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-muted)] tabular-nums">
                          {provider.total_tokens}
                        </span>
                      </div>
                      {provider.models.slice(0, 3).map((model: UsageBreakdownModel, index: number) => {
                        const pct = source.total_tokens > 0
                          ? Math.max(2, Math.round((model.total_tokens / source.total_tokens) * 100))
                          : 0
                        return (
                          <div key={`${source.source}:${provider.provider}:${model.model}`} className="flex items-center gap-2 text-sm">
                            <span className="w-28 truncate text-[var(--color-muted)]" title={model.model}>
                              {getUsageModelLabel(model.model)}
                            </span>
                            <div className="game-progress-track flex-1 h-4">
                              <div
                                className="game-progress-fill model-bar bg-[var(--color-accent)]"
                                style={{ width: `${pct}%`, '--bar-index': index } as CSSProperties}
                              />
                            </div>
                            <span className="w-8 text-right text-[var(--color-muted)] tabular-nums">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : models.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No data</p>
        ) : (
          <div className="flex flex-col gap-2">
            {models.slice(0, 5).map((m, index) => {
              const pct = Math.round((m.count / totalModelCount) * 100)
              const shortName = m.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
              return (
                <div key={m.model} className="flex items-center gap-2 text-sm">
                  <span className="w-28 truncate text-[var(--color-muted)]" title={m.model}>{shortName}</span>
                  <div className="game-progress-track flex-1 h-4">
                    <div
                      className="game-progress-fill model-bar bg-[var(--color-accent)]"
                      style={{ width: `${pct}%`, '--bar-index': index } as CSSProperties}
                    />
                  </div>
                  <span className="w-8 text-right text-[var(--color-muted)] tabular-nums">{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
