export async function fetchImageAsDataUrl(src: string | null) {
  if (!src) return null

  try {
    const response = await fetch(src)
    if (!response.ok) return null

    const contentTypeHeader = response.headers.get('content-type') ?? 'image/png'
    const contentType = contentTypeHeader.split(';', 1)[0]?.trim().toLowerCase() || 'image/png'

    if (!['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'].includes(contentType)) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return `data:${contentType};base64,${base64}`
  } catch {
    return null
  }
}
