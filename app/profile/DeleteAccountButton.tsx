'use client'

import { useState } from 'react'

export default function DeleteAccountButton() {
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (!confirmed) {
      setConfirmed(true)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/delete', { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload && typeof payload.error === 'string' ? payload.error : 'Delete failed')
      }

      window.location.href = '/api/auth/signout'
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not delete account right now.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`game-btn-red text-sm px-4 py-2 text-white font-bold disabled:opacity-50 ${confirmed ? 'opacity-90' : ''}`}
      >
        {loading
          ? 'Deleting…'
          : confirmed
          ? 'Are you sure? Click again to confirm'
          : 'Delete account'}
      </button>
      {error && (
        <p className="text-xs text-[var(--color-red)] font-bold">{error}</p>
      )}
    </div>
  )
}
