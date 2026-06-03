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
        setError(loadError instanceof Error ? loadError.message : 'Could not prepare your share card right now.')
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
        setError(shareError instanceof Error ? shareError.message : 'Sharing failed. Try the download fallback instead.')
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

            <div className="game-card relative z-10 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]/15 shrink-0">
                <div>
                  <p className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                    Share your profile
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">Private export only. No public profile link.</p>
                </div>
                <button
                  className="game-btn-icon w-9 h-9 text-sm text-[var(--color-muted)]"
                  onClick={() => setOpen(false)}
                  aria-label="Close share modal"
                >
                  ✕
                </button>
              </div>

              <div className="game-scrollbar overflow-y-auto px-5 py-5 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
                <div className="game-card bg-[var(--color-surface-2)] p-3">
                  <div className="rounded-[20px] overflow-hidden border-2 border-[var(--color-border)] bg-white">
                    {payload ? (
                      <div className="w-full overflow-auto bg-[var(--color-surface-2)]">
                        <div className="origin-top-left scale-[0.26] sm:scale-[0.37] md:scale-[0.48] lg:scale-[0.5] xl:scale-[0.58] w-[1200px] h-[630px]">
                          <ProfileShareCard data={payload.card} avatarSrc={payload.card.avatarUrl} />
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-[280px] flex items-center justify-center text-sm text-[var(--color-muted)] font-bold">
                        {loadPending ? 'Generating your share card...' : 'Preparing preview...'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="game-card p-4">
                    <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold mb-2">Caption</p>
                    <div className="rounded-[16px] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-text)] leading-relaxed">
                      {payload?.caption ?? 'We’ll generate a reusable caption along with the card.'}
                    </div>
                    {copied && <p className="text-xs text-[var(--color-accent-border)] font-bold mt-2">Caption copied.</p>}
                  </div>

                  {error && (
                    <div className="game-card p-4 border border-[var(--color-red)]/30 bg-[var(--color-red)]/10 text-sm text-[var(--color-text)]">
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

                  <p className="text-xs text-[var(--color-muted)] leading-relaxed px-1">
                    Native sharing works when your browser/device supports it. If not, download the image and paste the caption into X, LinkedIn, or anywhere else.
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
