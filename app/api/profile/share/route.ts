import { ImageResponse } from 'next/og'
import { createElement } from 'react'
import ProfileShareCard from '@/components/ProfileShareCard'
import { auth } from '@/lib/auth'
import { getInstanceMembership } from '@/lib/instance-membership'
import {
  buildShareFilename,
  fetchImageAsDataUrl,
  getProfileShareCardData,
} from '@/lib/profile-share'

export const runtime = 'nodejs'

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

    const imageResponse = new ImageResponse(
      createElement(ProfileShareCard, { data: card, avatarSrc: avatarDataUrl }),
      { width: 1200, height: 630 },
    )

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const image = `data:image/png;base64,${imageBuffer.toString('base64')}`

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
