import { NextRequest } from 'next/server'
import { consumeInstallToken } from '@/lib/sync-auth'

type ExchangeRequest = {
  token?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ExchangeRequest | null
  const token = body?.token?.trim()

  if (!token) {
    return Response.json({ error: 'Missing install token' }, { status: 400 })
  }

  let syncToken: string | null = null
  try {
    syncToken = await consumeInstallToken(token)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: message.includes('inactive') ? 403 : 500 })
  }

  if (!syncToken) {
    return Response.json({ error: 'Invalid or expired install token' }, { status: 404 })
  }

  return Response.json({
    syncToken,
    apiUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/api/sync`,
    schemaVersion: 2,
  })
}
