export type ActivityWidgetPreset = 'arcade' | 'night' | 'paper'

export type ActivityScale = [string, string, string, string, string]

export interface ActivityWidgetTheme {
  frame: string
  text: string
  muted: string
  chipBackground: string
  chipBorder: string
  tooltipBackground: string
  tooltipText: string
  avatarBackground: string
  activityScale: ActivityScale
}

export interface ActivityWidgetDay {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  messages: number
  sessions: number
}

export interface ActivityWidgetData {
  publicId: string
  displayName: string
  image: string | null
  preset: ActivityWidgetPreset
  currentStreak: number
  totalActiveDays: number
  lastSyncedAt: string | null
  activity: ActivityWidgetDay[]
}
