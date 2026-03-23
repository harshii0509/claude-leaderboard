import { supabaseAdmin } from './db'

export interface SyncPayload {
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_input_tokens: number
  total_cache_read_input_tokens: number
  total_messages: number
  total_sessions: number
  current_streak: number
  longest_streak: number
  models_used: Record<string, number>
  daily_activity: Array<{
    date: string
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens: number
    cache_read_input_tokens: number
    messages: number
    sessions: number
  }>
}

export async function syncUserStats(userId: string, payload: SyncPayload) {
  const { daily_activity, ...stats } = payload

  const { error: statsError } = await supabaseAdmin
    .from('user_stats')
    .upsert(
      {
        user_id: userId,
        ...stats,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (statsError) throw new Error(`user_stats upsert failed: ${statsError.message}`)

  if (daily_activity.length > 0) {
    const rows = daily_activity.map((d) => ({ user_id: userId, ...d }))
    const { error: activityError } = await supabaseAdmin
      .from('daily_activity')
      .upsert(rows, { onConflict: 'user_id,date' })

    if (activityError) throw new Error(`daily_activity upsert failed: ${activityError.message}`)
  }
}
