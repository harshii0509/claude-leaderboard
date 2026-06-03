import type { ProfileShareCardData } from './profile-share-types'

export interface SharePayload {
  image: string
  caption: string
  filename: string
  card: ProfileShareCardData
}

function getErrorMessageFromJson(value: unknown) {
  if (!value || typeof value !== 'object') return null

  const error = (value as { error?: unknown }).error
  return typeof error === 'string' && error.trim() ? error : null
}

export async function parseShareResponse(response: Response): Promise<SharePayload> {
  const contentType = response.headers.get('content-type') ?? ''
  const rawBody = await response.text()
  const looksLikeJson = contentType.includes('application/json')

  if (looksLikeJson && rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as unknown

      if (!response.ok) {
        throw new Error(
          getErrorMessageFromJson(parsed) ??
            `Failed to generate share card${response.status ? ` (${response.status})` : ''}.`
        )
      }

      return parsed as SharePayload
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw error
      }
    }
  }

  if (response.ok) {
    throw new Error('Share response was empty. Please try again.')
  }

  const fallbackMessage =
    rawBody.trim() || `Failed to generate share card${response.status ? ` (${response.status})` : ''}.`

  throw new Error(fallbackMessage)
}
