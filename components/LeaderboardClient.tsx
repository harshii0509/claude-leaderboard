'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Podium from './Podium'
import RankingsTable from './RankingsTable'
import SortBar from './SortBar'
import UserProfileModal from './UserProfileModal'
import WeeklySeasonPanel from './WeeklySeasonPanel'
import type { LeaderboardEntry, LeaderboardSort, LeaderboardView } from '@/lib/leaderboard-types'

async function fetcher(url: string) {
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok) {
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Failed to load leaderboard'
    throw new Error(message)
  }

  return payload
}

interface LeaderboardClientProps {
  initialData: LeaderboardView | null
  initialLoadFailed?: boolean
  signedIn?: boolean
}

export default function LeaderboardClient({
  initialData,
  initialLoadFailed = false,
  signedIn = false,
}: LeaderboardClientProps) {
  const [sort, setSort] = useState<LeaderboardSort>('weekly')
  const [period, setPeriod] = useState<LeaderboardView['period']>('week')
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)

  const { data, error, isLoading } = useSWR<LeaderboardView>(
    `/api/leaderboard-view?sort=${sort}&period=${period}`,
    fetcher,
    { fallbackData: initialData ?? undefined, refreshInterval: 60_000 }
  )
  const entries = Array.isArray(data?.entries) ? data.entries : []
  const season = data?.season ?? null
  const top3 = entries.slice(0, 3)
  const hasError = Boolean(error) || initialLoadFailed
  const showEmpty = !isLoading && entries.length === 0
  const errorMessage = error instanceof Error ? error.message : 'Leaderboard data is temporarily unavailable.'

  return (
    <div className="flex flex-col gap-4">
      {hasError && (
        <div className="game-card p-4 mb-3 border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 text-sm text-[var(--color-text)]">
          Leaderboard data could not be refreshed right now. {errorMessage}
        </div>
      )}
      {season && period === 'week' && <WeeklySeasonPanel season={season} entries={entries} />}
      {signedIn && top3.length >= 1 && (
        <Podium
          key={sort + period}
          top3={top3}
          metric={period === 'week' && sort === 'weekly' ? 'weekly' : 'tokens'}
        />
      )}
      <div className="game-card card-enter card-enter-delay-300 p-5 flex flex-col gap-4 relative z-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {period === 'week' ? 'Current Ladder' : period === '30d' ? '30 Day View' : 'Legacy Prestige'}
            </p>
            <h3
              className="text-2xl text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              {period === 'week' ? 'Keep climbing this week' : period === '30d' ? 'Longer momentum view' : 'All-time leaderboard'}
            </h3>
          </div>
          <SortBar sort={sort} period={period} onSort={setSort} onPeriod={setPeriod} />
        </div>
        {showEmpty ? (
          <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            No leaderboard data is available yet.
          </div>
        ) : (
          <RankingsTable
            key={sort + period}
            entries={entries}
            onUserClick={setSelectedUser}
            showRankDelta={period === 'week'}
            showWeeklyScore={period === 'week'}
          />
        )}
      </div>
      {selectedUser && (
        <UserProfileModal
          entry={selectedUser}
          rank={entries.findIndex((e) => e.user_id === selectedUser.user_id) + 1}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  )
}
