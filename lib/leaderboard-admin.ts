import { supabaseAdmin } from './db'

export interface LeaderboardSyncStatusUser {
  user_id: string
  name: string | null
  email: string | null
  last_synced_at: string | null
  last_activity_date: string | null
}

export interface LeaderboardSyncStatus {
  sync_generation: number
  total_users: number
  users_with_raw_events: number
  users_without_raw_events: number
  needs_sync: LeaderboardSyncStatusUser[]
}

export async function getLeaderboardSyncStatus(): Promise<LeaderboardSyncStatus> {
  const { data, error } = await supabaseAdmin.rpc('get_leaderboard_sync_status')

  if (error) {
    throw new Error(error.message)
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Missing leaderboard sync status')
  }

  const status = data as Partial<LeaderboardSyncStatus>

  return {
    sync_generation: typeof status.sync_generation === 'number' ? status.sync_generation : 1,
    total_users: typeof status.total_users === 'number' ? status.total_users : 0,
    users_with_raw_events: typeof status.users_with_raw_events === 'number' ? status.users_with_raw_events : 0,
    users_without_raw_events: typeof status.users_without_raw_events === 'number' ? status.users_without_raw_events : 0,
    needs_sync: Array.isArray(status.needs_sync) ? (status.needs_sync as LeaderboardSyncStatusUser[]) : [],
  }
}
