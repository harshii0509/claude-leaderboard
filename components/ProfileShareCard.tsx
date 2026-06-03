import type { CSSProperties } from 'react'
import { formatCompactNumber } from '@/lib/profile-share-utils'
import type { ProfileShareCardData } from '@/lib/profile-share-types'

interface ProfileShareCardProps {
  data: ProfileShareCardData
  avatarSrc?: string | null
  scale?: number
}

const palette = {
  sky: '#5ab5f9',
  surface: '#f1f5fa',
  surfaceInset: '#dbe7f2',
  border: '#222635',
  text: '#212121',
  muted: '#5a6480',
  accent: '#a6d345',
  accentBorder: '#204c17',
  purple: '#7c6af7',
  gold: '#f5c842',
}

function statBoxStyle(scale: number): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    border: `3px solid ${palette.border}`,
    borderRadius: 24 * scale,
    background: palette.surface,
    padding: `${18 * scale}px ${18 * scale}px ${16 * scale}px`,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: `0 ${6 * scale}px 0 -2px ${palette.border}`,
  }
}

export default function ProfileShareCard({ data, avatarSrc, scale = 1 }: ProfileShareCardProps) {
  const avatarSize = 112 * scale
  const stats = [
    { label: 'Tokens', value: formatCompactNumber(data.totalTokens), color: palette.accent },
    { label: 'Messages', value: formatCompactNumber(data.totalMessages), color: palette.purple },
    { label: 'Sessions', value: formatCompactNumber(data.totalSessions), color: palette.gold },
    { label: 'Streak', value: `${data.currentStreak}d`, color: '#ff8b3d' },
  ]

  return (
    <div
      style={{
        width: 1200 * scale,
        height: 630 * scale,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${palette.sky} 0%, #7fc8ff 100%)`,
        color: palette.text,
        fontFamily: 'Nunito, Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.2,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0, rgba(255,255,255,0.7) 6px, transparent 7px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 5px, transparent 6px), radial-gradient(circle at 60% 80%, rgba(255,255,255,0.45) 0, rgba(255,255,255,0.45) 8px, transparent 9px)',
        }}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          margin: 34 * scale,
          border: `4px solid ${palette.border}`,
          borderRadius: 42 * scale,
          background: 'rgba(241,245,250,0.95)',
          boxShadow: `0 ${10 * scale}px 0 -4px ${palette.border}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 368 * scale,
            padding: `${34 * scale}px ${28 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(166,211,69,0.3) 0%, rgba(255,255,255,0.85) 100%)',
            borderRight: `4px solid ${palette.border}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 * scale }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: `${10 * scale}px ${16 * scale}px`,
                borderRadius: 999,
                border: `3px solid ${palette.accentBorder}`,
                background: palette.accent,
                color: '#162410',
                fontWeight: 800,
                fontSize: 22 * scale,
                boxShadow: `0 ${5 * scale}px 0 -2px ${palette.accentBorder}`,
              }}
            >
              Shareable profile
            </div>

            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                border: `5px solid ${palette.border}`,
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${palette.purple}, #af6ae0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 48 * scale,
                fontWeight: 900,
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={data.displayName}
                  width={avatarSize}
                  height={avatarSize}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                data.displayName[0]?.toUpperCase() ?? '?'
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * scale }}>
              <div
                style={{
                  fontSize: 48 * scale,
                  lineHeight: 1.05,
                  fontWeight: 900,
                  fontFamily: 'Fredoka, Nunito, Arial, sans-serif',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {data.displayName}
              </div>
              <div style={{ fontSize: 22 * scale, color: palette.muted, fontWeight: 700 }}>
                {data.syncLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              border: `3px solid ${palette.border}`,
              borderRadius: 28 * scale,
              background: palette.surface,
              padding: `${18 * scale}px ${20 * scale}px`,
              boxShadow: `0 ${5 * scale}px 0 -2px ${palette.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10 * scale,
            }}
          >
            <div
              style={{
                fontSize: 18 * scale,
                color: palette.muted,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Current vibe
            </div>
            <div style={{ fontSize: 28 * scale, fontWeight: 900 }}>
              {data.topModel ? `Mostly using ${data.topModel}` : 'Just getting warmed up'}
            </div>
            <div style={{ fontSize: 18 * scale, color: palette.muted }}>
              Claude Leaderboard
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: `${34 * scale}px ${32 * scale}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 * scale }}>
            <div
              style={{
                fontSize: 20 * scale,
                color: palette.muted,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              AI activity snapshot
            </div>
            <div
              style={{
                fontSize: 54 * scale,
                lineHeight: 1.02,
                fontWeight: 900,
                fontFamily: 'Fredoka, Nunito, Arial, sans-serif',
              }}
            >
              Shipping with
              <br />
              serious momentum.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 * scale }}>
            {stats.map((stat) => (
              <div key={stat.label} style={statBoxStyle(scale)}>
                <div
                  style={{
                    fontSize: 18 * scale,
                    color: palette.muted,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12 * scale,
                    marginTop: 8 * scale,
                  }}
                >
                  <div
                    style={{
                      width: 18 * scale,
                      height: 18 * scale,
                      borderRadius: '50%',
                      background: stat.color,
                      border: `2px solid ${palette.border}`,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 42 * scale,
                      lineHeight: 1,
                      fontWeight: 900,
                      fontFamily: 'Fredoka, Nunito, Arial, sans-serif',
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: 28 * scale,
              border: `3px solid ${palette.border}`,
              background: palette.surfaceInset,
              padding: `${18 * scale}px ${22 * scale}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: `0 ${5 * scale}px 0 -2px ${palette.border}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 * scale }}>
              <div
                style={{
                  fontSize: 18 * scale,
                  color: palette.muted,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Powered by consistent sessions
              </div>
              <div style={{ fontSize: 26 * scale, fontWeight: 900 }}>
                {data.currentStreak > 0
                  ? `${data.currentStreak} day${data.currentStreak === 1 ? '' : 's'} in a row`
                  : 'Start a streak with your next sync'}
              </div>
            </div>
            <div
              style={{
                padding: `${12 * scale}px ${18 * scale}px`,
                borderRadius: 999,
                background: '#fff',
                border: `3px solid ${palette.border}`,
                fontSize: 18 * scale,
                fontWeight: 800,
              }}
            >
              claude-leaderboard
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
