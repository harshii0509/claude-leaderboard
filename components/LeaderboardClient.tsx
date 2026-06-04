'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clientQueryKeys, fetchApiJson } from '@/lib/client-query'
import Podium, { LeaderboardEntry } from './Podium'
import RankingsTable from './RankingsTable'
import SortBar from './SortBar'
import UserProfileModal from './UserProfileModal'

type Sort = 'tokens' | 'messages' | 'streak'
type Period = '7d' | '30d' | 'all'

interface LeaderboardClientProps {
  initialData: LeaderboardEntry[]
  initialLoadFailed?: boolean
  showPodium?: boolean
}

export default function LeaderboardClient({
  initialData,
  initialLoadFailed = false,
  showPodium = true,
}: LeaderboardClientProps) {
  const [sort, setSort] = useState<Sort>('tokens')
  const [period, setPeriod] = useState<Period>('all')
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)
  const shouldUseInitialData = sort === 'tokens' && period === 'all'

  const { data, error, isPending } = useQuery<LeaderboardEntry[]>({
    queryKey: clientQueryKeys.leaderboard(sort, period),
    queryFn: () =>
      fetchApiJson<LeaderboardEntry[]>(
        `/api/leaderboard?sort=${sort}&period=${period}`,
        'Failed to load leaderboard',
      ),
    initialData: shouldUseInitialData ? initialData : undefined,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  const entries = Array.isArray(data) ? data : []
  const top3 = entries.slice(0, 3)
  const hasError = Boolean(error) || initialLoadFailed
  const showEmpty = !isPending && entries.length === 0
  const errorMessage = error instanceof Error ? error.message : 'Leaderboard data is temporarily unavailable.'
  const leaderboardCardSpacing = showPodium && top3.length >= 1 ? 'mt-3' : ''

  return (
    <div className="flex flex-col">
      {hasError && (
        <div className="game-card p-4 mb-3 border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 text-sm text-[var(--color-text)]">
          Leaderboard data could not be refreshed right now. {errorMessage}
        </div>
      )}
      {showPodium && top3.length >= 1 ? <Podium key={sort + period} top3={top3} /> : null}
      <div className={`game-card card-enter card-enter-delay-300 p-5 flex flex-col gap-4 relative z-10 ${leaderboardCardSpacing}`}>
        <SortBar sort={sort} period={period} onSort={setSort} onPeriod={setPeriod} />
        {showEmpty ? (
          <div className="rounded-[16px] bg-[var(--color-surface-2)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            No leaderboard data is available yet.
          </div>
        ) : (
          <RankingsTable
            key={sort + period}
            entries={entries}
            onUserClick={setSelectedUser}
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
