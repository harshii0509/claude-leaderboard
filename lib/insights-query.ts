import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './db.ts'
import { isMissingInstanceGovernanceError } from './instance-governance.ts'
import {
  buildTeamInsights,
  emptyTeamInsights,
  type InsightActivityRow,
  type InsightEventRow,
  type InsightPeriod,
  type InsightUserRow,
  type TeamInsights,
} from './insights-core.ts'

type MembershipRow = {
  user_id: string
}

type UserRow = {
  id: string
  name: string | null
  image: string | null
}

export async function queryTeamInsights(
  period: InsightPeriod,
  client: Pick<SupabaseClient, 'from' | 'rpc'> = supabaseAdmin,
): Promise<TeamInsights> {
  let activeUserIds: string[] | null = null

  const { data: memberships, error: membershipError } = await client
    .from('instance_memberships')
    .select('user_id')
    .eq('is_active', true)

  if (membershipError) {
    if (isMissingInstanceGovernanceError(membershipError)) {
      console.warn('[insights][fallback:missing-instance-governance]', membershipError.message)
    } else {
      throw new Error(membershipError.message)
    }
  } else {
    activeUserIds = ((memberships ?? []) as MembershipRow[]).map((row) => row.user_id)
    if (activeUserIds.length === 0) {
      return emptyTeamInsights(period)
    }
  }

  const activityQuery = client
    .from('daily_activity')
    .select('user_id,date,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,messages,sessions')
  const { data: activityRows, error: activityError } = activeUserIds
    ? await activityQuery.in('user_id', activeUserIds)
    : await activityQuery

  if (activityError) throw new Error(activityError.message)

  const typedActivityRows = (activityRows ?? []) as InsightActivityRow[]
  if (typedActivityRows.length === 0) {
    return emptyTeamInsights(period)
  }

  const userIds = Array.from(new Set(typedActivityRows.map((row) => row.user_id)))
  const { data: users, error: usersError } = await client.rpc('get_public_users', {
    p_user_ids: userIds,
  })

  if (usersError) throw new Error(usersError.message)

  const since =
    period === 'all'
      ? null
      : (() => {
          const days = period === '7d' ? 7 : 30
          const date = new Date()
          date.setHours(0, 0, 0, 0)
          date.setDate(date.getDate() - (days - 1))
          return date.toISOString().slice(0, 10)
        })()

  const { data: eventRows, error: eventError } = await client.rpc('get_team_insight_events', {
    p_user_ids: userIds,
    p_since: since,
  })

  if (eventError) throw new Error(eventError.message)

  return buildTeamInsights(
    {
      activityRows: typedActivityRows,
      eventRows: (eventRows ?? []) as InsightEventRow[],
      users: (users ?? []) as InsightUserRow[] | UserRow[],
    },
    period,
  )
}
