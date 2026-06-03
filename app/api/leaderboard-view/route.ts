import { NextRequest } from 'next/server'
import { getLeaderboardView } from '@/lib/leaderboard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const sort = searchParams.get('sort') ?? 'weekly'
  const period = searchParams.get('period') ?? 'week'

  try {
    const view = await getLeaderboardView(sort, period)
    return Response.json(view)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
