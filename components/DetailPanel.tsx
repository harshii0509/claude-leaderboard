'use client'

import { useEffect, useState } from 'react'
import ActivityHeatmap from './ActivityHeatmap'

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

export default function DetailPanel({ userId }: DetailPanelProps) {
  const [activity, setActivity] = useState<DayData[]>([])
  const [models, setModels] = useState<ModelEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [actRes, statsRes] = await Promise.all([
        fetch(`/api/activity/${userId}`),
        fetch(`/api/user-stats/${userId}`),
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
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return <div className="py-4 px-6 text-[var(--color-muted)] text-sm font-bold">Loading...</div>
  }

  const totalModelCount = models.reduce((s, m) => s + m.count, 0) || 1

  return (
    <div className="px-6 py-4 bg-[var(--color-surface-2)] border-t border-[var(--color-border)]/15 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-2 font-bold">Activity (90 days)</p>
        <ActivityHeatmap activity={activity} days={90} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-2 font-bold">Models used</p>
        {models.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No data</p>
        ) : (
          <div className="flex flex-col gap-2">
            {models.slice(0, 5).map((m, index) => {
              const pct = Math.round((m.count / totalModelCount) * 100)
              const shortName = m.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')
              return (
                <div key={m.model} className="flex items-center gap-2 text-sm">
                  <span className="w-28 truncate text-[var(--color-muted)]" title={m.model}>{shortName}</span>
                  <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="model-bar bg-[var(--color-accent)] h-1.5 rounded-full"
                      style={{ width: `${pct}%`, '--bar-index': index } as React.CSSProperties}
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
