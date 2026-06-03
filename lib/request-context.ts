export function getRequestOriginFromHeaders(headers: Pick<Headers, 'get'>): string | null {
  const forwardedProto = headers.get('x-forwarded-proto')
  const forwardedHost = headers.get('x-forwarded-host') ?? headers.get('host')

  if (!forwardedHost) return null

  return `${forwardedProto ?? 'https'}://${forwardedHost}`
}

export function resolveAppUrl(requestOrigin: string | null): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin ?? 'http://localhost:3000'
}

export function buildJoinUrl(appUrl: string): string {
  return new URL('/join', appUrl).toString()
}

export function getDisplayUrl(url: string): string {
  const parsed = new URL(url)
  return `${parsed.host}${parsed.pathname}`
}

export function isLikelyMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false

  return /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(userAgent)
}
