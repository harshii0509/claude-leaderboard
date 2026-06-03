import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { computeStreaks } from '@/lib/leaderboard-math'
import { getInstanceMembership } from '@/lib/instance-membership'
import { getUserUsageBreakdown } from '@/lib/usage-breakdown'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!isUuid(userId)) {
      return Response.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const membership = await getInstanceMembership(userId)
    if (!membership?.is_active) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const [{ data, error }, { data: activity, error: activityError }, usageBreakdown] = await Promise.all([
      supabaseAdmin
        .from('user_stats')
        .select('models_used, longest_streak, total_sessions')
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('daily_activity')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: true }),
      getUserUsageBreakdown(userId),
    ])

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500
      return Response.json({ error: status === 404 ? 'User not found' : error.message }, { status })
    }

    if (activityError) {
      return Response.json({ error: activityError.message }, { status: 500 })
    }

    const streaks = computeStreaks((activity ?? []).map((row) => row.date))

    return Response.json({
      ...data,
      usage_breakdown: usageBreakdown,
      current_streak: streaks.current,
      longest_streak: Math.max(data.longest_streak ?? 0, streaks.longest),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load profile stats.'
    return Response.json({ error: message }, { status: 500 })
  }
}
