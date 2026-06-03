import { NextRequest } from 'next/server'
import { getTeamInsights, isInsightPeriod } from '@/lib/insights'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const periodValue = searchParams.get('period') ?? 'all'

  if (!isInsightPeriod(periodValue)) {
    return Response.json({ error: 'Invalid period' }, { status: 400 })
  }

  try {
    const data = await getTeamInsights(periodValue)
    return Response.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
