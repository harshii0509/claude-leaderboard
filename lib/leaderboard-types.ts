export type LeaderboardSort = 'weekly' | 'tokens' | 'messages' | 'streak'

export type LeaderboardPeriod = 'week' | '30d' | 'all' | '7d'

export interface LeaderboardEntry {
  user_id: string
  name: string
  image: string | null
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cache_creation_input_tokens: number
  total_cache_read_input_tokens: number
  total_messages: number
  total_sessions: number
  current_streak: number
  longest_streak: number
  models_used: Record<string, number>
  last_synced_at: string | null
  rank_delta: number
  weekly_score: number
  active_days: number
}

export interface WeeklyHighlight {
  id: string
  title: string
  label: string
  detail: string
  tone: 'gold' | 'green' | 'blue' | 'purple'
  userId: string | null
}

export interface TeamQuest {
  id: string
  title: string
  detail: string
  progress: number
  target: number
}

export interface WeeklySeasonSummary {
  label: string
  start_date: string
  end_date: string
  resets_in_days: number
  crown_user_id: string | null
  crown_name: string | null
  crown_score: number
  active_members: number
  total_members: number
  total_active_days: number
  highlights: WeeklyHighlight[]
  quests: TeamQuest[]
}

export interface LeaderboardView {
  entries: LeaderboardEntry[]
  sort: LeaderboardSort
  period: Exclude<LeaderboardPeriod, '7d'>
  season: WeeklySeasonSummary | null
}
