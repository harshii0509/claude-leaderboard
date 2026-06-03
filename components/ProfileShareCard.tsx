import { PROFILE_SHARE_CARD_SIZE } from '@/lib/profile-share-constants'
import type { ProfileShareCardData } from '@/lib/profile-share-types'
import { formatCompactNumber } from '@/lib/profile-share-utils'

interface ProfileShareCardProps {
  data: ProfileShareCardData
  avatarSrc?: string | null
  scale?: number
}

const palette = {
  background: '#5ab5f9',
  surface: '#f1f5fa',
  surface2: '#deeaf5',
  border: '#222635',
  text: '#212121',
  muted: '#5a6480',
  accent: '#a6d345',
  accentBorder: '#204c17',
  accent2: '#7c6af7',
  avatarRing: '#af6ae0',
  gold: '#f5c842',
  goldBorder: '#b8900a',
  bronze: '#c8844a',
  bronzeBorder: '#8b5a2b',
  white: '#ffffff',
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function nameFontSize(name: string, scale: number) {
  if (name.length > 24) return 52 * scale
  if (name.length > 18) return 60 * scale
  return 72 * scale
}

function topModelLabel(topModel: string | null) {
  return topModel ? `Mostly using ${topModel}` : 'Ready to climb the board'
}

function StatCard({
  label,
  value,
  color,
  borderColor,
  scale,
}: {
  label: string
  value: string
  color: string
  borderColor: string
  scale: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 220 * scale,
        border: `${4 * scale}px solid ${palette.border}`,
        borderRadius: 28 * scale,
        background: palette.white,
        padding: 24 * scale,
        boxShadow: `inset 6px -12px 0 0 ${palette.surface2}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 18 * scale,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: 999,
            background: color,
            border: `${3 * scale}px solid ${borderColor}`,
            marginRight: 12 * scale,
          }}
        />
        <div
          style={{
            display: 'flex',
            fontFamily: 'Nunito',
            fontSize: 22 * scale,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: palette.muted,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          fontFamily: 'Fredoka',
          fontSize: 72 * scale,
          lineHeight: 0.95,
          fontWeight: 600,
          color: palette.text,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default function ProfileShareCard({
  data,
  avatarSrc,
  scale = 1,
}: ProfileShareCardProps) {
  const outerPad = 64 * scale
  const cardPad = 54 * scale
  const avatarSize = 220 * scale
  const statRows = [
    [
      { label: 'Tokens', value: formatCompactNumber(data.totalTokens), color: palette.accent, borderColor: palette.accentBorder },
      { label: 'Messages', value: formatCompactNumber(data.totalMessages), color: palette.accent2, borderColor: palette.border },
    ],
    [
      { label: 'Sessions', value: formatCompactNumber(data.totalSessions), color: palette.gold, borderColor: palette.goldBorder },
      { label: 'Streak', value: `${data.currentStreak}d`, color: palette.bronze, borderColor: palette.bronzeBorder },
    ],
  ]

  return (
    <div
      style={{
        width: PROFILE_SHARE_CARD_SIZE * scale,
        height: PROFILE_SHARE_CARD_SIZE * scale,
        display: 'flex',
        flexDirection: 'column',
        background: palette.background,
        color: palette.text,
        fontFamily: 'Nunito',
        padding: outerPad,
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          border: `${6 * scale}px solid ${palette.border}`,
          borderRadius: 44 * scale,
          background: palette.surface,
          boxShadow: `inset 10px -18px 0 0 #bfd1e8`,
          padding: cardPad,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 28 * scale,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: `${14 * scale}px ${24 * scale}px`,
              borderRadius: 999,
              border: `${4 * scale}px solid ${palette.accentBorder}`,
              background: palette.accent,
              boxShadow: `inset 6px -12px 0 0 rgba(255,255,255,0.22)`,
              fontFamily: 'Nunito',
              fontSize: 24 * scale,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#18230f',
            }}
          >
            Claude Leaderboard
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: `${14 * scale}px ${22 * scale}px`,
              borderRadius: 999,
              border: `${4 * scale}px solid ${palette.border}`,
              background: palette.surface2,
              fontSize: 22 * scale,
              fontWeight: 800,
              color: palette.muted,
            }}
          >
            {data.syncLabel}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40 * scale,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: avatarSize,
              height: avatarSize,
              marginRight: 30 * scale,
              padding: 12 * scale,
              borderRadius: 999,
              border: `${5 * scale}px solid ${palette.border}`,
              background: palette.avatarRing,
              boxShadow: `inset 8px -16px 0 0 rgba(255,255,255,0.22)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                borderRadius: 999,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                background: palette.white,
                color: palette.text,
                fontFamily: 'Fredoka',
                fontSize: 92 * scale,
                fontWeight: 600,
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={data.displayName}
                  width={avatarSize}
                  height={avatarSize}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                initials(data.displayName)
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'Fredoka',
                fontSize: nameFontSize(data.displayName, scale),
                fontWeight: 600,
                lineHeight: 0.95,
                marginBottom: 18 * scale,
              }}
            >
              {data.displayName}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 32 * scale,
                lineHeight: 1.1,
                fontWeight: 800,
                color: palette.text,
                marginBottom: 18 * scale,
              }}
            >
              Built on consistent sessions and serious momentum.
            </div>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: `${14 * scale}px ${22 * scale}px`,
                borderRadius: 26 * scale,
                border: `${4 * scale}px solid ${palette.border}`,
                background: palette.white,
                fontSize: 24 * scale,
                fontWeight: 800,
                color: palette.muted,
              }}
            >
              {topModelLabel(data.topModel)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20 * scale,
            marginBottom: 34 * scale,
          }}
        >
          {statRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              style={{
                display: 'flex',
                gap: 20 * scale,
              }}
            >
              {row.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  color={stat.color}
                  borderColor={stat.borderColor}
                  scale={scale}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `${5 * scale}px solid ${palette.border}`,
            borderRadius: 30 * scale,
            background: palette.surface2,
            padding: `${24 * scale}px ${30 * scale}px`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'Nunito',
                fontSize: 22 * scale,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: palette.muted,
                marginBottom: 10 * scale,
              }}
            >
              Share your run
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Fredoka',
                fontSize: 42 * scale,
                fontWeight: 600,
                color: palette.text,
              }}
            >
              From the board to your feed.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${18 * scale}px ${28 * scale}px`,
              borderRadius: 999,
              border: `${4 * scale}px solid ${palette.border}`,
              background: palette.white,
              fontFamily: 'Fredoka',
              fontSize: 34 * scale,
              fontWeight: 600,
              color: palette.text,
            }}
          >
            claude-leaderboard
          </div>
        </div>
      </div>
    </div>
  )
}
