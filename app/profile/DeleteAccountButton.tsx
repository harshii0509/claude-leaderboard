'use client'

import { useState } from 'react'

export default function DeleteAccountButton() {
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }

    setLoading(true)
    await fetch('/api/user/delete', { method: 'DELETE' })
    window.location.href = '/api/auth/signout'
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
        confirmed
          ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-red-500 hover:text-red-500'
      }`}
    >
      {loading
        ? 'Deleting…'
        : confirmed
        ? 'Are you sure? Click again to confirm'
        : 'Delete account'}
    </button>
  )
}
