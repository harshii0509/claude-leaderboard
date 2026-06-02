'use client'
import { useState, useEffect } from 'react'
import { playError } from '@/lib/audio'

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'
const MESSAGE_BY_ERROR: Record<string, string> = {
  MembershipInactive: 'Your access to this leaderboard has been removed. Contact an admin if this is unexpected.',
  AdminRequired: 'Admin access is required to view that page.',
  OwnerRequired: 'Owner access is required to do that.',
}

function ToastBody({ message, error }: { message: string; error: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    playError()
    const dismiss = setTimeout(() => {
      setLeaving(true)
    }, 4000)
    return () => clearTimeout(dismiss)
  }, [error])

  function dismiss() {
    setLeaving(true)
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm ${leaving ? 'toast-out' : 'toast-in'}`}
      style={{
        background: 'var(--color-red)',
        border: '2px solid var(--color-red-border)',
        borderRadius: '20px',
        boxShadow: '0px 6px 0px -2px var(--color-red-border)',
      }}
    >
      <div className="relative px-4 py-3 flex items-start gap-3">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: 'inherit', boxShadow: 'inset 5px -10px 0px 0px rgba(255,255,255,0.15)' }}
        />
        <p
          className="flex-1 text-sm text-white font-bold leading-snug relative z-10"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {message}
        </p>
        <button
          onClick={dismiss}
          className="text-white/60 hover:text-white text-lg leading-none font-bold flex-shrink-0 mt-0.5 relative z-10"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function ErrorToast({
  error,
  accessDeniedMessage,
}: {
  error?: string | null
  accessDeniedMessage?: string | null
}) {
  if (!error) return null

  const message =
    error === 'AccessDenied'
      ? accessDeniedMessage ?? DEFAULT_MESSAGE
      : MESSAGE_BY_ERROR[error] ?? DEFAULT_MESSAGE

  return <ToastBody key={error} error={error} message={message} />
}
