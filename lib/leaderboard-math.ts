export interface ActivityRow {
  date: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  messages: number
  sessions: number
}

export interface StreakSummary {
  current: number
  longest: number
}

export interface WeeklyScoreBreakdown {
  score: number
  activeDays: number
  sessionScore: number
  tokenScore: number
}

export interface SeasonWindow {
  start: string
  end: string
}

export function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(value: string): number | null {
  const time = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(time) ? time : null
}

export function computeStreaks(dates: string[], today = new Date()): StreakSummary {
  const uniqueDates = Array.from(new Set(dates))
    .map((value) => ({ value, time: parseDate(value) }))
    .filter((item): item is { value: string; time: number } => item.time !== null)
    .sort((a, b) => a.time - b.time)

  if (uniqueDates.length === 0) {
    return { current: 0, longest: 0 }
  }

  let longest = 1
  let run = 1
  for (let i = 1; i < uniqueDates.length; i += 1) {
    const diffDays = Math.round((uniqueDates[i].time - uniqueDates[i - 1].time) / 86_400_000)
    if (diffDays === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  const active = new Set(uniqueDates.map((item) => item.value))
  const anchor = new Date(today)
  anchor.setHours(0, 0, 0, 0)

  const todayStr = dateKey(anchor)
  if (!active.has(todayStr)) {
    anchor.setDate(anchor.getDate() - 1)
  }

  let current = 0
  while (active.has(dateKey(anchor))) {
    current += 1
    anchor.setDate(anchor.getDate() - 1)
  }

  return { current, longest }
}

export function totalTokens(row: Pick<ActivityRow, 'input_tokens' | 'output_tokens' | 'cache_creation_input_tokens' | 'cache_read_input_tokens'>): number {
  return (
    row.input_tokens +
    row.output_tokens +
    row.cache_creation_input_tokens +
    row.cache_read_input_tokens
  )
}

export function startOfWeek(today = new Date()): Date {
  const anchor = new Date(today)
  anchor.setHours(0, 0, 0, 0)

  const day = anchor.getDay()
  const offset = day === 0 ? 6 : day - 1
  anchor.setDate(anchor.getDate() - offset)

  return anchor
}

export function seasonWindow(today = new Date()): SeasonWindow {
  const start = startOfWeek(today)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  return {
    start: dateKey(start),
    end: dateKey(end),
  }
}

export function daysUntilNextWeek(today = new Date()): number {
  const start = startOfWeek(today)
  const next = new Date(start)
  next.setDate(next.getDate() + 7)

  const diff = next.getTime() - today.getTime()
  return Math.max(1, Math.ceil(diff / 86_400_000))
}

export function computeWeeklyScore(rows: ActivityRow[]): WeeklyScoreBreakdown {
  const activeDays = rows.length
  const sessionScore = rows.reduce((sum, row) => sum + Math.min(row.sessions, 3) * 18, 0)
  const tokenScore = rows.reduce((sum, row) => {
    const dailyTokens = totalTokens(row)
    const points = Math.round(Math.log10(dailyTokens + 10) * 12)
    return sum + Math.min(48, points)
  }, 0)

  return {
    score: activeDays * 90 + sessionScore + tokenScore,
    activeDays,
    sessionScore,
    tokenScore,
  }
}
