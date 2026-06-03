import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { createElement } from 'react'
import ProfileShareCard from '../../../../components/ProfileShareCard'
import { auth } from '@/lib/auth'
import { PROFILE_SHARE_CARD_SIZE } from '@/lib/profile-share-constants'
import { getInstanceMembership } from '@/lib/instance-membership'
import {
  buildShareFilename,
  fetchImageAsDataUrl,
  getProfileShareCardData,
} from '@/lib/profile-share'

export const runtime = 'nodejs'

const shareFontsPromise = Promise.all([
  readFile(join(process.cwd(), 'app/fonts/fredoka-latin.woff2')),
  readFile(join(process.cwd(), 'app/fonts/nunito-latin.woff2')),
]).then(([fredoka, nunito]) => [
  { name: 'Fredoka', data: fredoka, weight: 600 as const, style: 'normal' as const },
  { name: 'Nunito', data: nunito, weight: 800 as const, style: 'normal' as const },
])

async function renderShareImage(
  card: Awaited<ReturnType<typeof getProfileShareCardData>>,
  avatarSrc: string | null,
) {
  const imageResponse = new ImageResponse(
    createElement(ProfileShareCard, { data: card, avatarSrc }),
    {
      width: PROFILE_SHARE_CARD_SIZE,
      height: PROFILE_SHARE_CARD_SIZE,
      fonts: await shareFontsPromise,
    },
  )

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  return `data:image/png;base64,${imageBuffer.toString('base64')}`
}

async function renderEmergencyShareImage(
  card: Awaited<ReturnType<typeof getProfileShareCardData>>,
) {
  const fallback = new ImageResponse(
    createElement(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#5ab5f9',
          color: '#212121',
          padding: '64px',
          fontFamily: 'Nunito',
        },
      },
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            border: '6px solid #222635',
            borderRadius: '44px',
            background: '#f1f5fa',
            padding: '54px',
            boxShadow: 'inset 10px -18px 0 0 #bfd1e8',
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '28px',
            },
          },
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '14px 24px',
                borderRadius: '999px',
                border: '4px solid #204c17',
                background: '#a6d345',
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#18230f',
              },
            },
            'Claude Leaderboard',
          ),
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '14px 22px',
                borderRadius: '999px',
                border: '4px solid #222635',
                background: '#deeaf5',
                fontSize: '22px',
                fontWeight: 800,
                color: '#5a6480',
              },
            },
            card.syncLabel,
          ),
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'Fredoka',
              fontSize: '76px',
              fontWeight: 600,
              marginBottom: '18px',
            },
          },
          card.displayName,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: '34px',
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: '28px',
            },
          },
          'Built on consistent sessions and serious momentum.',
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '14px 22px',
              borderRadius: '26px',
              border: '4px solid #222635',
              background: '#ffffff',
              fontSize: '24px',
              fontWeight: 800,
              color: '#5a6480',
              marginBottom: '34px',
            },
          },
          card.topModel ? `Mostly using ${card.topModel}` : 'Ready to climb the board',
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginBottom: '34px',
            },
          },
          ...[
            [
              ['Tokens', String(card.totalTokens)],
              ['Messages', String(card.totalMessages)],
            ],
            [
              ['Sessions', String(card.totalSessions)],
              ['Streak', `${card.currentStreak}d`],
            ],
          ].map((row, rowIndex) =>
            createElement(
              'div',
              {
                key: `row-${rowIndex}`,
                style: {
                  display: 'flex',
                  gap: '20px',
                },
              },
              ...row.map(([label, value]) =>
                createElement(
                  'div',
                  {
                    key: label,
                    style: {
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      minHeight: '220px',
                      border: '4px solid #222635',
                      borderRadius: '28px',
                      background: '#ffffff',
                      padding: '24px',
                      boxShadow: 'inset 6px -12px 0 0 #deeaf5',
                    },
                  },
                  createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        fontSize: '22px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#5a6480',
                        marginBottom: '18px',
                      },
                    },
                    label,
                  ),
                  createElement(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        fontFamily: 'Fredoka',
                        fontSize: '72px',
                        lineHeight: 0.95,
                        fontWeight: 600,
                      },
                    },
                    value,
                  ),
                ),
              ),
            ),
          ),
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '5px solid #222635',
              borderRadius: '30px',
              background: '#deeaf5',
              padding: '24px 30px',
            },
          },
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
              },
            },
            createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#5a6480',
                  marginBottom: '10px',
                },
              },
              'Share your run',
            ),
            createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  fontFamily: 'Fredoka',
                  fontSize: '42px',
                  fontWeight: 600,
                },
              },
              'From the board to your feed.',
            ),
          ),
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 28px',
                borderRadius: '999px',
                border: '4px solid #222635',
                background: '#ffffff',
                fontFamily: 'Fredoka',
                fontSize: '34px',
                fontWeight: 600,
              },
            },
            'claude-leaderboard',
          ),
        ),
      ),
    ),
    {
      width: PROFILE_SHARE_CARD_SIZE,
      height: PROFILE_SHARE_CARD_SIZE,
      fonts: await shareFontsPromise,
    },
  )

  const imageBuffer = Buffer.from(await fallback.arrayBuffer())
  return `data:image/png;base64,${imageBuffer.toString('base64')}`
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const membership = await getInstanceMembership(session.user.id)
    if (!membership?.is_active) {
      return Response.json({ error: 'Membership inactive' }, { status: 403 })
    }

    const displayName = session.user.name?.trim() || 'Unknown User'
    const avatarUrl = session.user.image ?? null
    const card = await getProfileShareCardData(session.user.id, displayName, avatarUrl)
    const avatarDataUrl = await fetchImageAsDataUrl(avatarUrl)
    let image: string

    try {
      image = await renderShareImage(card, avatarDataUrl)
    } catch (error) {
      console.warn('[profile-share] primary render failed', error)

      try {
        if (!avatarDataUrl) throw error

        console.warn('[profile-share] avatar render failed, retrying without avatar', error)
        image = await renderShareImage(card, null)
      } catch (fallbackError) {
        console.warn('[profile-share] rich card render failed, using emergency fallback', fallbackError)
        image = await renderEmergencyShareImage(card)
      }
    }

    return Response.json({
      image,
      caption: card.caption,
      filename: buildShareFilename(card.displayName),
      card,
    })
  } catch (error) {
    console.error('[profile-share] failed to generate share card', error)
    return Response.json(
      { error: 'Could not generate your share card right now. Please try again.' },
      { status: 500 },
    )
  }
}
