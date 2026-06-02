import { NextRequest } from 'next/server'
import { getLeaderboardData } from '@/lib/leaderboard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const sort = searchParams.get('sort') ?? 'tokens'
  const period = searchParams.get('period') ?? 'all'

  try {
    const rows = await getLeaderboardData(sort, period)
    return Response.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
