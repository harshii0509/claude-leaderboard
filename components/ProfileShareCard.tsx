import { formatCompactNumber } from '@/lib/profile-share-utils'
import type { ProfileShareCardData } from '@/lib/profile-share-types'

interface ProfileShareCardProps {
  data: ProfileShareCardData
  avatarSrc?: string | null
  scale?: number
}

const palette = {
  skyTop: '#6fc4ff',
  skyBottom: '#a6ddff',
  shell: '#f7fbff',
  panel: '#e8f1f8',
  border: '#1f2937',
  text: '#16202b',
  muted: '#5a6b7d',
  accent: '#b8e04a',
  accentBorder: '#35511b',
  purple: '#7568f4',
  gold: '#f3c94a',
  orange: '#ff9548',
}

function statColor(label: string) {
  switch (label) {
    case 'Tokens':
      return palette.accent
    case 'Messages':
      return palette.purple
    case 'Sessions':
      return palette.gold
    default:
      return palette.orange
  }
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function ProfileShareCard({
  data,
  avatarSrc,
  scale = 1,
}: ProfileShareCardProps) {
  const outerPad = 32 * scale
  const avatarSize = 108 * scale
  const stats = [
    { label: 'Tokens', value: formatCompactNumber(data.totalTokens) },
    { label: 'Messages', value: formatCompactNumber(data.totalMessages) },
    { label: 'Sessions', value: formatCompactNumber(data.totalSessions) },
    { label: 'Streak', value: `${data.currentStreak}d` },
  ]

  return (
    <div
      style={{
        width: 1200 * scale,
        height: 630 * scale,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)`,
        color: palette.text,
        fontFamily: 'Arial, sans-serif',
        padding: outerPad,
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          borderRadius: 36 * scale,
          border: `${4 * scale}px solid ${palette.border}`,
          background: palette.shell,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 360 * scale,
            padding: 28 * scale,
            background: `linear-gradient(180deg, rgba(184,224,74,0.32) 0%, #ffffff 100%)`,
            borderRight: `${4 * scale}px solid ${palette.border}`,
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
                alignSelf: 'flex-start',
                padding: `${10 * scale}px ${16 * scale}px`,
                borderRadius: 999,
                border: `${3 * scale}px solid ${palette.accentBorder}`,
                background: palette.accent,
                color: '#18230f',
                fontWeight: 800,
                fontSize: 22 * scale,
                marginBottom: 20 * scale,
              }}
            >
              Shareable profile
            </div>

            <div
              style={{
                display: 'flex',
                width: avatarSize,
                height: avatarSize,
                borderRadius: 999,
                border: `${5 * scale}px solid ${palette.border}`,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${palette.purple} 0%, #b36ef0 100%)`,
                color: '#ffffff',
                fontSize: 44 * scale,
                fontWeight: 900,
                marginBottom: 20 * scale,
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

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 42 * scale,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  marginBottom: 8 * scale,
                }}
              >
                {data.displayName}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 22 * scale,
                  color: palette.muted,
                  fontWeight: 700,
                }}
              >
                {data.syncLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: `${3 * scale}px solid ${palette.border}`,
              borderRadius: 24 * scale,
              background: palette.panel,
              padding: 18 * scale,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 16 * scale,
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: palette.muted,
                fontWeight: 800,
                marginBottom: 10 * scale,
              }}
            >
              Current vibe
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 28 * scale,
                fontWeight: 900,
                marginBottom: 8 * scale,
              }}
            >
              {data.topModel ? `Mostly using ${data.topModel}` : 'Just getting warmed up'}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18 * scale,
                color: palette.muted,
              }}
            >
              Claude Leaderboard
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 30 * scale,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 18 * scale,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 18 * scale,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: palette.muted,
                fontWeight: 800,
                marginBottom: 12 * scale,
              }}
            >
              AI activity snapshot
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 50 * scale,
                lineHeight: 1.04,
                fontWeight: 900,
              }}
            >
              <div style={{ display: 'flex' }}>Shipping with</div>
              <div style={{ display: 'flex' }}>serious momentum.</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              marginBottom: 18 * scale,
            }}
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '48.5%',
                  border: `${3 * scale}px solid ${palette.border}`,
                  borderRadius: 22 * scale,
                  background: palette.shell,
                  padding: 18 * scale,
                  marginBottom: index < 2 ? 14 * scale : 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 16 * scale,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: palette.muted,
                    fontWeight: 800,
                    marginBottom: 10 * scale,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: 18 * scale,
                      height: 18 * scale,
                      borderRadius: 999,
                      background: statColor(stat.label),
                      border: `${2 * scale}px solid ${palette.border}`,
                      marginRight: 12 * scale,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 38 * scale,
                      lineHeight: 1,
                      fontWeight: 900,
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: `${3 * scale}px solid ${palette.border}`,
              borderRadius: 24 * scale,
              background: palette.panel,
              padding: `${18 * scale}px ${20 * scale}px`,
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
                  fontSize: 16 * scale,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: palette.muted,
                  fontWeight: 800,
                  marginBottom: 8 * scale,
                }}
              >
                Powered by consistent sessions
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 24 * scale,
                  fontWeight: 900,
                }}
              >
                {data.currentStreak > 0
                  ? `${data.currentStreak} day${data.currentStreak === 1 ? '' : 's'} in a row`
                  : 'Start a streak with your next sync'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                padding: `${12 * scale}px ${18 * scale}px`,
                borderRadius: 999,
                background: '#ffffff',
                border: `${3 * scale}px solid ${palette.border}`,
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
