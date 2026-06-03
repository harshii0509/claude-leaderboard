function getErrorMessageFromJson(value: unknown) {
  if (!value || typeof value !== 'object') return null

  const error = (value as { error?: unknown }).error
  return typeof error === 'string' && error.trim() ? error : null
}

function getFallbackErrorMessage(response: Response, fallbackMessage: string) {
  return `${fallbackMessage}${response.status ? ` (${response.status})` : ''}.`
}

export interface ParsedApiResponse<T> {
  data: T | null
  error: string | null
}

export async function parseApiJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ParsedApiResponse<T>> {
  const rawBody = await response.text()
  const contentType = response.headers.get('content-type') ?? ''
  const looksLikeJson =
    contentType.includes('application/json') ||
    /^\s*[[{]/.test(rawBody)

  let parsed: unknown = null

  if (rawBody && looksLikeJson) {
    try {
      parsed = JSON.parse(rawBody) as unknown
    } catch {
      return {
        data: null,
        error: response.ok
          ? `${fallbackMessage} returned invalid JSON.`
          : rawBody.trim() || getFallbackErrorMessage(response, fallbackMessage),
      }
    }
  } else if (rawBody) {
    parsed = rawBody
  }

  if (!response.ok) {
    const message =
      getErrorMessageFromJson(parsed) ??
      (typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null) ??
      getFallbackErrorMessage(response, fallbackMessage)

    return { data: null, error: message }
  }

  return { data: parsed as T | null, error: null }
}
