export const PUBLIC_WIDGET_ACTIVITY_DAYS = 365
export const DEFAULT_WIDGET_PRESET = 'arcade'

export const WIDGET_PRESETS = ['arcade', 'night', 'paper'] as const

export type WidgetPreset = (typeof WIDGET_PRESETS)[number]

export interface WidgetActivityDay {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  messages: number
  sessions: number
}

export interface UserWidgetSettings {
  user_id: string
  public_id: string
  is_published: boolean
  preset: WidgetPreset
}

export interface PublicActivityWidgetData {
  publicId: string
  displayName: string
  image: string | null
  preset: WidgetPreset
  currentStreak: number
  totalActiveDays: number
  lastSyncedAt: string | null
  activity: WidgetActivityDay[]
}

export function isWidgetPreset(value: string): value is WidgetPreset {
  return WIDGET_PRESETS.includes(value as WidgetPreset)
}
