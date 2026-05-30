'use client'
import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold"
    >
      Sign out
    </button>
  )
}
