import type { PublicWidgetData } from './types'

function trimTrailingSlash(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function buildPublicWidgetDataUrl(baseUrl: string, publicId: string) {
  return `${trimTrailingSlash(baseUrl)}/api/public-widget/${encodeURIComponent(publicId)}`
}

export async function fetchPublicWidgetData(baseUrl: string, publicId: string): Promise<PublicWidgetData> {
  const response = await fetch(buildPublicWidgetDataUrl(baseUrl, publicId), {
    headers: {
      Accept: 'application/json',
    },
  })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Failed to load widget (${response.status})`
    throw new Error(error)
  }

  return body as PublicWidgetData
}
