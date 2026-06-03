'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { playPodium } from '@/lib/audio'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'

interface PodiumProps {
  top3: LeaderboardEntry[]
  metric?: 'weekly' | 'tokens'
}

const MEDALS = [
  {
    rank: 1,
    bg: '#f5c842',
    border: '#b8900a',
    textColor: '#5a3c00',
    blockHeight: 'h-28',
    animClass: '',
    podiumRiseClass: 'podium-rise podium-rise-delay-1',
    ringClass: 'rank-1',
  },
  {
    rank: 2,
    bg: '#c8d4e0',
    border: '#7a90a8',
    textColor: '#2a3a4a',
    blockHeight: 'h-20',
    animClass: 'bounce-in-delay-1',
    podiumRiseClass: 'podium-rise',
    ringClass: 'rank-2',
  },
  {
    rank: 3,
    bg: '#c8844a',
    border: '#8b5a2b',
    textColor: '#fff',
    blockHeight: 'h-16',
    animClass: 'bounce-in-delay-2',
    podiumRiseClass: 'podium-rise podium-rise-delay-2',
    ringClass: 'rank-3',
  },
]

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export default function Podium({ top3, metric = 'tokens' }: PodiumProps) {
  useEffect(() => {
    const t = setTimeout(playPodium, 300)
    return () => clearTimeout(t)
  }, [])

  // Display order: 2nd (left), 1st (center), 3rd (right)
  const display = [top3[1], top3[0], top3[2]].filter(Boolean)
  const medalMap = [MEDALS[1], MEDALS[0], MEDALS[2]]

  return (
    <div className="flex items-end justify-center gap-3 pt-4 pb-0">
      {display.map((entry, i) => {
        const medal = medalMap[i]
        return (
          <div key={entry.user_id} className="flex flex-col items-center w-32 relative">
            {/* Stage spotlight — V-beam rising from podium base */}
            <div className={`podium-spotlight ${medal.ringClass}`} />
            {/* Avatar with spinning gradient ring */}
            <div className={`avatar-ring ${medal.ringClass} mb-2 bounce-in ${medal.animClass} relative z-10`}>
              <div className="game-avatar w-16 h-16">
                {entry.image ? (
                  <Image
                    src={entry.image}
                    alt={entry.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
                    style={{ background: medal.bg, color: medal.textColor }}
                  >
                    {entry.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <p
              className="text-sm font-extrabold text-white text-center truncate max-w-[7rem] leading-tight relative z-10"
              style={{ textShadow: '0 1px 0 rgba(0,0,50,0.25)' }}
            >
              {entry.name.split(' ')[0]}
            </p>
            <p className="text-xs text-white/70 mb-2 text-center font-bold tabular-nums relative z-10">
              {metric === 'weekly' ? `Score ${fmt(entry.weekly_score)}` : fmt(entry.total_tokens)}
            </p>

            {/* Podium block */}
            <div
              className={`w-full ${medal.blockHeight} podium-block ${medal.podiumRiseClass} flex flex-col items-center justify-end pb-2 relative z-10`}
              style={{
                background: medal.bg,
                borderColor: medal.border,
                boxShadow: `0 6px 0 -2px ${medal.border}`,
              }}
            >
              <span
                className="text-2xl leading-none tabular-nums font-[family-name:var(--font-display)]"
                style={{ color: medal.textColor, fontWeight: 600 }}
              >
                {medal.rank}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
