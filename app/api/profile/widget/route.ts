import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { getOrCreateUserWidgetSettings, updateUserWidgetSettings } from '@/lib/user-widget'
import {
  getUserWidgetSettingsUnavailableMessage,
  isMissingUserWidgetSettingsError,
} from '@/lib/user-widget-errors'
import { isWidgetPreset, type WidgetPreset } from '@/lib/widget-types'

interface WidgetUpdatePayload {
  isPublished?: unknown
  preset?: unknown
  regeneratePublicId?: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getOrCreateUserWidgetSettings(session.user.id)
    return Response.json({ settings })
  } catch (error) {
    if (isMissingUserWidgetSettingsError(error)) {
      return Response.json(
        { error: getUserWidgetSettingsUnavailableMessage() },
        { status: 503 },
      )
    }

    const message = error instanceof Error ? error.message : 'Could not load widget settings.'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: WidgetUpdatePayload
  try {
    payload = (await request.json()) as WidgetUpdatePayload
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isPlainObject(payload)) {
    return Response.json({ error: 'Invalid widget payload' }, { status: 400 })
  }

  const updates: {
    is_published?: boolean
    preset?: WidgetPreset
    regeneratePublicId?: boolean
  } = {}

  if ('isPublished' in payload) {
    if (typeof payload.isPublished !== 'boolean') {
      return Response.json({ error: 'Invalid publish flag' }, { status: 400 })
    }
    updates.is_published = payload.isPublished
  }

  if ('preset' in payload) {
    if (typeof payload.preset !== 'string' || !isWidgetPreset(payload.preset)) {
      return Response.json({ error: 'Invalid widget preset' }, { status: 400 })
    }
    updates.preset = payload.preset
  }

  if ('regeneratePublicId' in payload) {
    if (typeof payload.regeneratePublicId !== 'boolean') {
      return Response.json({ error: 'Invalid regenerate flag' }, { status: 400 })
    }
    updates.regeneratePublicId = payload.regeneratePublicId
  }

  try {
    const previous = await getOrCreateUserWidgetSettings(session.user.id)
    const settings = await updateUserWidgetSettings(session.user.id, updates)

    revalidateTag(`public-widget:${previous.public_id}`, 'max')
    if (settings.public_id !== previous.public_id) {
      revalidateTag(`public-widget:${settings.public_id}`, 'max')
    }

    return Response.json({ settings })
  } catch (error) {
    if (isMissingUserWidgetSettingsError(error)) {
      return Response.json(
        { error: getUserWidgetSettingsUnavailableMessage() },
        { status: 503 },
      )
    }

    const message = error instanceof Error ? error.message : 'Could not update widget settings.'
    return Response.json({ error: message }, { status: 500 })
  }
}
