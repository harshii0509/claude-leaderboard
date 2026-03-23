import Image from 'next/image'

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
}

interface PodiumProps {
  top3: LeaderboardEntry[]
}

const MEDALS = [
  { label: '1st', color: 'var(--color-gold)', height: 'h-28', order: 1 },
  { label: '2nd', color: 'var(--color-silver)', height: 'h-20', order: 0 },
  { label: '3rd', color: 'var(--color-bronze)', height: 'h-16', order: 2 },
]

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function Podium({ top3 }: PodiumProps) {
  // Reorder: 2nd, 1st, 3rd
  const display = [top3[1], top3[0], top3[2]].filter(Boolean)
  const medalMap = [MEDALS[1], MEDALS[0], MEDALS[2]]

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {display.map((entry, i) => {
        const medal = medalMap[i]
        return (
          <div key={entry.user_id} className="flex flex-col items-center gap-2 w-32">
            {entry.image ? (
              <Image
                src={entry.image}
                alt={entry.name}
                width={56}
                height={56}
                className="rounded-full ring-2"
                style={{ ringColor: medal.color } as React.CSSProperties}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: medal.color, color: '#0f0f13' }}
              >
                {entry.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--color-text)] truncate max-w-[7rem]">{entry.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{fmt(entry.total_tokens)} tokens</p>
            </div>
            <div
              className={`w-full ${medal.height} rounded-t-lg flex items-end justify-center pb-2`}
              style={{ background: medal.color + '22', borderTop: `2px solid ${medal.color}` }}
            >
              <span className="text-lg font-bold" style={{ color: medal.color }}>{medal.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
