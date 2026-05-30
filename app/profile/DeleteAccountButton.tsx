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
      className={`game-btn-red text-sm px-4 py-2 text-white font-bold disabled:opacity-50 ${confirmed ? 'opacity-90' : ''}`}
    >
      {loading
        ? 'Deleting…'
        : confirmed
        ? 'Are you sure? Click again to confirm'
        : 'Delete account'}
    </button>
  )
}
