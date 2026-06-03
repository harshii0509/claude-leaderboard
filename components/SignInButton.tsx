'use client'
import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import type { AuthProviderOption } from '@/lib/auth-providers'

export default function SignInButton({
  providers,
  callbackUrl = '/',
  containerClassName = '',
  buttonClassName = '',
}: {
  providers: AuthProviderOption[]
  callbackUrl?: string
  containerClassName?: string
  buttonClassName?: string
}) {
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      // Page restored from bfcache after pressing back from Google — reset so button works
      if (e.persisted) setPending(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  if (providers.length === 0) {
    return (
      <div className="game-card px-3 py-2 text-xs text-[var(--color-text)]">
        Auth not configured
      </div>
    )
  }

  const primaryProvider = providers[0]
  const buttonLabel =
    providers.length === 1
      ? `Sign in with ${primaryProvider.label}`
      : `Sign in (${providers.map((provider) => provider.label).join(' / ')})`

  return (
    <div className={`flex items-center gap-2 ${containerClassName}`.trim()}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => {
            if (pending) return
            setPending(true)
            signIn(provider.id, { callbackUrl })
          }}
          disabled={pending}
          className={`game-btn text-sm px-4 py-2 text-black font-bold gap-2 flex items-center disabled:opacity-60 ${buttonClassName}`.trim()}
          aria-label={`Sign in with ${provider.label}`}
          title={buttonLabel}
        >
          {pending ? 'Redirecting…' : `Sign in with ${provider.label}`}
        </button>
      ))}
    </div>
  )
}
