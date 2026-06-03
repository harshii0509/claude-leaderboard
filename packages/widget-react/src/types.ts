export type WidgetPreset = 'arcade' | 'night' | 'paper'

export interface PublicWidgetDay {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  messages: number
  sessions: number
}

export interface PublicWidgetData {
  publicId: string
  displayName: string
  image: string | null
  preset: WidgetPreset
  currentStreak: number
  totalActiveDays: number
  lastSyncedAt: string | null
  activity: PublicWidgetDay[]
}
