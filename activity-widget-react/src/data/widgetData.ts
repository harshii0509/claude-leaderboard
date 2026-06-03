import type { ActivityWidgetData, ActivityWidgetDay } from '../types.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeDay(value: unknown): ActivityWidgetDay | null {
  if (!isObject(value)) return null
  if (typeof value.date !== 'string') return null
  if (
    !isNumber(value.input_tokens) ||
    !isNumber(value.output_tokens) ||
    !isNumber(value.cache_creation_input_tokens) ||
    !isNumber(value.cache_read_input_tokens) ||
    !isNumber(value.messages) ||
    !isNumber(value.sessions)
  ) {
    return null
  }

  return {
    date: value.date,
    input_tokens: value.input_tokens,
    output_tokens: value.output_tokens,
    cache_creation_input_tokens: value.cache_creation_input_tokens,
    cache_read_input_tokens: value.cache_read_input_tokens,
    messages: value.messages,
    sessions: value.sessions,
  }
}

export function normalizeWidgetData(value: unknown): ActivityWidgetData {
  if (!isObject(value)) {
    throw new Error('Widget response was not a JSON object.')
  }

  const activity = Array.isArray(value.activity)
    ? value.activity.map(normalizeDay).filter((day): day is ActivityWidgetDay => day !== null)
    : null

  if (
    typeof value.publicId !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.preset !== 'string' ||
    !isNumber(value.currentStreak) ||
    !isNumber(value.totalActiveDays) ||
    activity === null
  ) {
    throw new Error('Widget response was missing required fields.')
  }

  return {
    publicId: value.publicId,
    displayName: value.displayName,
    image: typeof value.image === 'string' ? value.image : null,
    preset: value.preset as ActivityWidgetData['preset'],
    currentStreak: value.currentStreak,
    totalActiveDays: value.totalActiveDays,
    lastSyncedAt: typeof value.lastSyncedAt === 'string' ? value.lastSyncedAt : null,
    activity,
  }
}

export function totalTokensForDay(day: ActivityWidgetDay) {
  return day.input_tokens + day.output_tokens + day.cache_creation_input_tokens + day.cache_read_input_tokens
}

export function buildWeeks(activity: ActivityWidgetDay[]) {
  const activityMap = new Map(activity.map((day) => [day.date, day]))
  const today = new Date()
  const cells: ActivityWidgetDay[] = []

  for (let i = 364; i >= 0; i -= 1) {
    const nextDate = new Date(today)
    nextDate.setDate(nextDate.getDate() - i)
    const dateStr = nextDate.toISOString().slice(0, 10)
    cells.push(
      activityMap.get(dateStr) ?? {
        date: dateStr,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        messages: 0,
        sessions: 0,
      },
    )
  }

  const weeks: ActivityWidgetDay[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }
  return weeks
}

export function intensity(tokens: number, max: number) {
  if (tokens === 0 || max === 0) return 0
  return Math.ceil((tokens / max) * 4)
}

export function monthAbbr(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })
}

export function isMonthTick(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDate() <= 7
}

export function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getTooltipLines(day: ActivityWidgetDay) {
  const totalTokens = totalTokensForDay(day)
  if (totalTokens === 0) {
    return ['No activity']
  }

  return [
    `${totalTokens.toLocaleString()} tokens`,
    `${day.messages} messages`,
    `${day.sessions} session${day.sessions !== 1 ? 's' : ''}`,
  ]
}
