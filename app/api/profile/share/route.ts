import { ImageResponse } from 'next/og'
import { createElement } from 'react'
import ProfileShareCard from '../../../../components/ProfileShareCard'
import { auth } from '@/lib/auth'
import { getInstanceMembership } from '@/lib/instance-membership'
import {
  buildShareFilename,
  fetchImageAsDataUrl,
  getProfileShareCardData,
} from '@/lib/profile-share'

export const runtime = 'nodejs'

async function renderShareImage(
  card: Awaited<ReturnType<typeof getProfileShareCardData>>,
  avatarSrc: string | null,
) {
  const imageResponse = new ImageResponse(
    createElement(ProfileShareCard, { data: card, avatarSrc }),
    { width: 1200, height: 630 },
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
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #6fc4ff 0%, #a6ddff 100%)',
          color: '#16202b',
          padding: '40px',
          fontFamily: 'Arial, sans-serif',
        },
      },
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            border: '4px solid #1f2937',
            borderRadius: '32px',
            background: '#f7fbff',
            padding: '28px',
          },
        },
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: '44px',
              fontWeight: 900,
              marginBottom: '12px',
            },
          },
          card.displayName,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: '22px',
              color: '#5a6b7d',
              marginBottom: '20px',
            },
          },
          card.syncLabel,
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              fontSize: '54px',
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: '24px',
            },
          },
          createElement('div', { style: { display: 'flex' } }, 'Shipping with'),
          createElement('div', { style: { display: 'flex' } }, 'serious momentum.'),
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
            },
          },
          ...[
            ['Tokens', String(card.totalTokens)],
            ['Messages', String(card.totalMessages)],
            ['Sessions', String(card.totalSessions)],
            ['Streak', `${card.currentStreak}d`],
          ].map(([label, value]) =>
            createElement(
              'div',
              {
                key: label,
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  width: '23%',
                  border: '3px solid #1f2937',
                  borderRadius: '22px',
                  background: '#ffffff',
                  padding: '16px',
                },
              },
              createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: '15px',
                    textTransform: 'uppercase',
                    color: '#5a6b7d',
                    fontWeight: 800,
                    marginBottom: '8px',
                  },
                },
                label,
              ),
              createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: '30px',
                    fontWeight: 900,
                  },
                },
                value,
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
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '4px solid #1f2937',
            borderRadius: '28px',
            background: '#e8f1f8',
            padding: '20px 28px',
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
                fontSize: '16px',
                textTransform: 'uppercase',
                color: '#5a6b7d',
                fontWeight: 800,
                marginBottom: '8px',
              },
            },
            'Claude Leaderboard',
          ),
          createElement(
            'div',
            {
              style: {
                display: 'flex',
                fontSize: '24px',
                fontWeight: 900,
              },
            },
            card.topModel ? `Top model: ${card.topModel}` : 'Keep the streak alive',
          ),
        ),
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              fontSize: '20px',
              fontWeight: 900,
            },
          },
          'claude-leaderboard',
        ),
      ),
    ),
    { width: 1200, height: 630 },
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
