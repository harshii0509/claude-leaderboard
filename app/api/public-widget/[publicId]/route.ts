import { getPublicActivityWidgetData } from '@/lib/user-widget'

function isSafePublicId(value: string) {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(value)
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params

  if (!isSafePublicId(publicId)) {
    return Response.json({ error: 'Invalid widget id' }, { status: 400, headers: CORS_HEADERS })
  }

  try {
    const widget = await getPublicActivityWidgetData(publicId)
    if (!widget) {
      return Response.json({ error: 'Widget not found' }, { status: 404, headers: CORS_HEADERS })
    }

    return Response.json(widget, {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load widget.'
    return Response.json({ error: message }, { status: 500, headers: CORS_HEADERS })
  }
}
