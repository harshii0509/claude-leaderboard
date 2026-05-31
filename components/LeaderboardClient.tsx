'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Podium, { LeaderboardEntry } from './Podium'
import RankingsTable from './RankingsTable'
import SortBar from './SortBar'
import UserProfileModal from './UserProfileModal'

type Sort = 'tokens' | 'messages' | 'streak'
type Period = '7d' | '30d' | 'all'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface LeaderboardClientProps {
  initialData: LeaderboardEntry[]
}

export default function LeaderboardClient({ initialData }: LeaderboardClientProps) {
  const [sort, setSort] = useState<Sort>('tokens')
  const [period, setPeriod] = useState<Period>('all')
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null)

  const { data } = useSWR<LeaderboardEntry[]>(
    `/api/leaderboard?sort=${sort}&period=${period}`,
    fetcher,
    { fallbackData: initialData, refreshInterval: 60_000 }
  )

  const entries = Array.isArray(data) ? data : []
  const top3 = entries.slice(0, 3)

  return (
    <div className="flex flex-col">
      {top3.length >= 1 && <Podium key={sort + period} top3={top3} />}
      <div className="game-card card-enter card-enter-delay-300 p-5 flex flex-col gap-4 relative z-10 mt-3">
        <SortBar sort={sort} period={period} onSort={setSort} onPeriod={setPeriod} />
        <RankingsTable
          key={sort + period}
          entries={entries}
          sort={sort}
          onUserClick={setSelectedUser}
        />
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
