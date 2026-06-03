'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  buildXShareIntentUrl,
  getLinkedInComposerUrl,
  parseShareResponse,
  type SharePayload,
} from '@/lib/profile-share-client'

function dataUrlToFile(dataUrl: string, filename: string) {
  const [header, payload] = dataUrl.split(',', 2)
  if (!header || !payload) throw new Error('Invalid share image payload')

  const match = header.match(/data:(.*?);base64/)
  const mimeType = match?.[1] ?? 'image/png'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], filename, { type: mimeType })
}

function triggerImageDownload(payload: SharePayload) {
  const anchor = document.createElement('a')
  anchor.href = payload.image
  anchor.download = payload.filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function openShareWindow(url: string) {
  return window.open(url, '_blank', 'noopener,noreferrer')
}

type HandoffTone = 'info' | 'success'

interface HandoffState {
  tone: HandoffTone
  message: string
}

export default function ProfileShareButton() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [handoff, setHandoff] = useState<HandoffState | null>(null)
  const [supportsNativeShare, setSupportsNativeShare] = useState(false)
  const [sharePending, startShareTransition] = useTransition()
  const [loadPending, startLoadTransition] = useTransition()

  useEffect(() => {
    setSupportsNativeShare(Boolean(navigator.share))
  }, [])

  useEffect(() => {
    if (!open || payload) return

    startLoadTransition(async () => {
      try {
        const response = await fetch('/api/profile/share')
        const body = await parseShareResponse(response)
        setPayload(body)
        setError(null)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not prepare your share card right now.',
        )
      }
    })
  }, [open, payload])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  function resetTransientState() {
    setError(null)
    setHandoff(null)
  }

  async function handleNativeShare() {
    if (!payload) return

    startShareTransition(async () => {
      try {
        if (!navigator.share) {
          throw new Error('Native sharing is not available on this device.')
        }

        const imageFile = dataUrlToFile(payload.image, payload.filename)

        if (navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({
            title: `${payload.card.displayName}'s Claude Leaderboard snapshot`,
            text: payload.caption,
            files: [imageFile],
          })
          setHandoff({ tone: 'success', message: 'Shared with your device’s native sheet.' })
          return
        }

        await navigator.share({
          title: `${payload.card.displayName}'s Claude Leaderboard snapshot`,
          text: payload.caption,
        })
        setHandoff({ tone: 'success', message: 'Opened your device’s native share sheet.' })
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === 'AbortError') return
        setError(
          shareError instanceof Error
            ? shareError.message
            : 'Sharing failed. Try the platform shortcuts or download the image instead.',
        )
      }
    })
  }

  function handleDownload() {
    if (!payload) return

    triggerImageDownload(payload)
    setHandoff({
      tone: 'success',
      message: 'Image downloaded. You can upload it anywhere you want to share it.',
    })
    setError(null)
  }

  async function handleCopyCaption() {
    if (!payload) return

    try {
      await navigator.clipboard.writeText(payload.caption)
      setCopied(true)
      setError(null)
      setHandoff({ tone: 'success', message: 'Caption copied. Paste it into your post when needed.' })
    } catch {
      setError('Could not copy the caption. Please copy it manually below.')
    }
  }

  function handlePlatformShare(platform: 'x' | 'linkedin') {
    if (!payload) return

    triggerImageDownload(payload)
    setError(null)

    const platformUrl =
      platform === 'x' ? buildXShareIntentUrl(payload.caption) : getLinkedInComposerUrl()
    const openedWindow = openShareWindow(platformUrl)

    if (!openedWindow) {
      setError('Your browser blocked the share window. Please allow pop-ups and try again.')
      setHandoff({
        tone: 'info',
        message: 'The image was downloaded, but the composer window did not open.',
      })
      return
    }

    setHandoff({
      tone: 'success',
      message:
        platform === 'x'
          ? 'Image downloaded. We opened X with your caption. Attach the card in the composer and post.'
          : 'Image downloaded. We opened LinkedIn’s composer. Upload the card there and paste the caption if needed.',
    })
  }

  return (
    <>
      <button
        type="button"
        className="game-btn text-sm px-4 py-2 text-black font-bold"
        onClick={() => {
          resetTransientState()
          setOpen(true)
        }}
      >
        Share profile
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-[var(--color-border)]/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <div className="game-card relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden">
              <div className="shrink-0 border-b border-[var(--color-border)]/15 px-5 py-4 flex items-center justify-between">
                <div>
                  <p
                    className="text-lg font-semibold text-[var(--color-text)]"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    Share your profile
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Pick a platform and we’ll prep the card for posting.
                  </p>
                </div>
                <button
                  className="game-btn-icon h-9 w-9 text-sm text-[var(--color-muted)]"
                  onClick={() => setOpen(false)}
                  aria-label="Close share modal"
                >
                  ✕
                </button>
              </div>

              <div className="game-scrollbar overflow-y-auto px-5 py-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="game-card bg-[var(--color-surface-2)] p-3">
                  <div className="overflow-hidden rounded-[20px] border-2 border-[var(--color-border)] bg-white">
                    {payload ? (
                      <div className="w-full overflow-auto bg-[var(--color-surface-2)] p-3">
                        <img
                          src={payload.image}
                          alt={`${payload.card.displayName}'s share card preview`}
                          className="mx-auto h-auto w-full max-w-[720px] rounded-[18px] border-2 border-[var(--color-border)] bg-white"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center text-sm font-bold text-[var(--color-muted)]">
                        {loadPending ? 'Generating your square card...' : 'Preparing preview...'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="game-card p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Share to
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        className="game-btn px-4 py-3 text-sm font-bold text-black disabled:opacity-60"
                        onClick={() => handlePlatformShare('x')}
                        disabled={!payload}
                      >
                        Share to X
                      </button>
                      <button
                        type="button"
                        className="game-btn-ghost px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                        onClick={() => handlePlatformShare('linkedin')}
                        disabled={!payload}
                      >
                        Share to LinkedIn
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
                      We’ll download the image first, then open the composer for the platform you picked.
                    </p>
                  </div>

                  <div className="game-card p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                      Caption
                    </p>
                    <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4 text-sm leading-relaxed text-[var(--color-text)]">
                      {payload?.caption ?? 'We’ll generate a reusable caption along with the card.'}
                    </div>
                    {copied && (
                      <p className="mt-2 text-xs font-bold text-[var(--color-accent-border)]">
                        Caption copied.
                      </p>
                    )}
                  </div>

                  {handoff && (
                    <div
                      className={`game-card p-4 text-sm ${
                        handoff.tone === 'success'
                          ? 'border border-[var(--color-accent-border)]/25 bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                          : 'border border-[var(--color-border)]/15 bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      }`}
                    >
                      {handoff.message}
                    </div>
                  )}

                  {error && (
                    <div className="game-card border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 p-4 text-sm text-[var(--color-text)]">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="game-btn-icon px-4 py-3 text-sm font-bold text-[var(--color-text)]"
                      onClick={handleDownload}
                      disabled={!payload}
                    >
                      Download image
                    </button>
                    <button
                      type="button"
                      className="game-btn-icon px-4 py-3 text-sm font-bold text-[var(--color-text)]"
                      onClick={handleCopyCaption}
                      disabled={!payload}
                    >
                      Copy caption
                    </button>
                    {supportsNativeShare && (
                      <button
                        type="button"
                        className="game-btn-icon px-4 py-3 text-sm font-bold text-[var(--color-text)] disabled:opacity-60"
                        onClick={handleNativeShare}
                        disabled={!payload || sharePending}
                      >
                        {sharePending ? 'Opening native share...' : 'Share natively'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
