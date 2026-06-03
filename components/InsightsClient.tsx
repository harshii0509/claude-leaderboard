'use client'

import { useState } from 'react'
import useSWR from 'swr'
import TeamInsightsSection from '@/components/TeamInsightsSection'
import PeriodTabs from '@/components/PeriodTabs'
import type { TeamInsights } from '@/lib/insights'

type Period = '7d' | '30d' | 'all'

async function fetcher(url: string) {
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok) {
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Failed to load insights'
    throw new Error(message)
  }

  return payload
}

interface InsightsClientProps {
  initialInsights: TeamInsights | null
  initialLoadFailed?: boolean
}

export default function InsightsClient({
  initialInsights,
  initialLoadFailed = false,
}: InsightsClientProps) {
  const [period, setPeriod] = useState<Period>('all')
  const { data, error, isLoading } = useSWR<TeamInsights>(
    `/api/insights?period=${period}`,
    fetcher,
    { fallbackData: initialInsights ?? undefined, refreshInterval: 60_000 },
  )

  const hasError = Boolean(error) || (initialLoadFailed && !data)
  const errorMessage = error instanceof Error ? error.message : 'Insights are temporarily unavailable.'

  return (
    <div className="flex flex-col gap-3">
      <div className="game-card p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2
              className="text-xl text-[var(--color-text)] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Instance Analytics
            </h2>
            <p className="text-sm text-[var(--color-muted)] font-bold">
              Analytics currently reflect everyone active in this leaderboard instance.
            </p>
          </div>
          <PeriodTabs period={period} onPeriod={setPeriod} />
        </div>
      </div>

      <TeamInsightsSection
        data={data ?? null}
        period={period}
        loading={isLoading}
        errorMessage={hasError ? errorMessage : null}
      />
    </div>
  )
}
