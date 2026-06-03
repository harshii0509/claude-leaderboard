'use client'

import { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import ProfileShareCard from '@/components/ProfileShareCard'
import { parseShareResponse, type SharePayload } from '@/lib/profile-share-client'

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

export default function ProfileShareButton() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharePending, startShareTransition] = useTransition()
  const [loadPending, startLoadTransition] = useTransition()

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
          return
        }

        await navigator.share({
          title: `${payload.card.displayName}'s Claude Leaderboard snapshot`,
          text: payload.caption,
        })
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === 'AbortError') return
        setError(
          shareError instanceof Error
            ? shareError.message
            : 'Sharing failed. Try the download fallback instead.',
        )
      }
    })
  }

  function handleDownload() {
    if (!payload) return

    const anchor = document.createElement('a')
    anchor.href = payload.image
    anchor.download = payload.filename
    anchor.click()
  }

  async function handleCopyCaption() {
    if (!payload) return

    try {
      await navigator.clipboard.writeText(payload.caption)
      setCopied(true)
      setError(null)
    } catch {
      setError('Could not copy the caption. Please copy it manually below.')
    }
  }

  return (
    <>
      <button
        type="button"
        className="game-btn text-sm px-4 py-2 text-black font-bold"
        onClick={() => {
          setError(null)
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

            <div className="game-card relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden">
              <div className="shrink-0 border-b border-[var(--color-border)]/15 px-5 py-4 flex items-center justify-between">
                <div>
                  <p
                    className="text-lg font-semibold text-[var(--color-text)]"
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    Share your profile
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Private export only. No public profile link.
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

              <div className="game-scrollbar overflow-y-auto px-5 py-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="game-card bg-[var(--color-surface-2)] p-3">
                  <div className="overflow-hidden rounded-[20px] border-2 border-[var(--color-border)] bg-white">
                    {payload ? (
                      <div className="w-full overflow-auto bg-[var(--color-surface-2)]">
                        <div className="h-[630px] w-[1200px] origin-top-left scale-[0.26] sm:scale-[0.37] md:scale-[0.48] lg:scale-[0.5] xl:scale-[0.58]">
                          <ProfileShareCard data={payload.card} avatarSrc={payload.card.avatarUrl} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[280px] items-center justify-center text-sm font-bold text-[var(--color-muted)]">
                        {loadPending ? 'Generating your share card...' : 'Preparing preview...'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
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

                  {error && (
                    <div className="game-card border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 p-4 text-sm text-[var(--color-text)]">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="game-btn px-4 py-3 text-sm font-bold text-black disabled:opacity-60"
                      onClick={handleNativeShare}
                      disabled={!payload || sharePending}
                    >
                      {sharePending ? 'Sharing...' : 'Share'}
                    </button>
                    <button
                      type="button"
                      className="game-btn-ghost px-4 py-3 text-sm font-bold text-white"
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
                  </div>

                  <p className="px-1 text-xs leading-relaxed text-[var(--color-muted)]">
                    Native sharing works when your browser or device supports it. If not, download
                    the image and paste the caption into X, LinkedIn, or anywhere else.
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
