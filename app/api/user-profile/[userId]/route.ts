import { NextRequest } from 'next/server'
import { getUserProfileDetail } from '@/lib/user-profile'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params

    if (!isUuid(userId)) {
      return Response.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const detail = await getUserProfileDetail(userId)
    if (!detail) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load profile details.'
    return Response.json({ error: message }, { status: 500 })
  }
}
