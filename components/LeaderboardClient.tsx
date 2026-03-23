'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Podium, { LeaderboardEntry } from './Podium'
import RankingsTable from './RankingsTable'
import SortBar from './SortBar'

type Sort = 'tokens' | 'messages' | 'streak'
type Period = '7d' | '30d' | 'all'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface LeaderboardClientProps {
  initialData: LeaderboardEntry[]
}

export default function LeaderboardClient({ initialData }: LeaderboardClientProps) {
  const [sort, setSort] = useState<Sort>('tokens')
  const [period, setPeriod] = useState<Period>('all')

  const { data } = useSWR<LeaderboardEntry[]>(
    `/api/leaderboard?sort=${sort}&period=${period}`,
    fetcher,
    { fallbackData: initialData, refreshInterval: 60_000 }
  )

  const entries = Array.isArray(data) ? data : []
  const top3 = entries.slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      {top3.length >= 1 && <Podium top3={top3} />}
      <SortBar sort={sort} period={period} onSort={setSort} onPeriod={setPeriod} />
      <RankingsTable entries={entries} sort={sort} />
    </div>
  )
}
