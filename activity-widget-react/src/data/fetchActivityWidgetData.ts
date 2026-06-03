import { normalizeWidgetData } from './widgetData.js'
import type { ActivityWidgetData } from '../types.js'

function trimTrailingSlash(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function buildActivityWidgetDataUrl(baseUrl: string, publicId: string) {
  return `${trimTrailingSlash(baseUrl)}/api/public-widget/${encodeURIComponent(publicId)}`
}

export async function fetchActivityWidgetData(
  baseUrl: string,
  publicId: string,
): Promise<ActivityWidgetData> {
  const response = await fetch(buildActivityWidgetDataUrl(baseUrl, publicId), {
    headers: {
      Accept: 'application/json',
    },
  })

  const rawBody = await response.text()
  const hasJsonBody =
    (response.headers.get('content-type') ?? '').includes('application/json') ||
    /^\s*[[{]/.test(rawBody)

  let body: unknown = null

  if (rawBody && hasJsonBody) {
    try {
      body = JSON.parse(rawBody) as unknown
    } catch {
      throw new Error(response.ok ? 'Widget response returned invalid JSON.' : rawBody.trim() || `Failed to load widget (${response.status})`)
    }
  } else if (rawBody) {
    body = rawBody
  }

  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : typeof body === 'string' && body.trim()
          ? body.trim()
          : `Failed to load widget (${response.status})`

    throw new Error(error)
  }

  return normalizeWidgetData(body)
}
