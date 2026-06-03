import Link from 'next/link'
import AudioToggle from '@/components/AudioToggle'
import SignOutButton from '@/components/SignOutButton'
import SignInButton from '@/components/SignInButton'
import AppPrimaryNav from '@/components/AppPrimaryNav'
import type { AuthProviderOption } from '@/lib/auth-providers'

interface AppHeaderProps {
  signedIn: boolean
  authProviders: AuthProviderOption[]
}

export default function AppHeader({ signedIn, authProviders }: AppHeaderProps) {
  return (
    <header className="relative z-10 py-4 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <div>
            <h1
              className="text-2xl text-white tracking-tight leading-tight text-balance"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textShadow: '0px 1px 0px rgba(0,0,50,0.25)',
              }}
            >
              TokenWars
            </h1>
          </div>
          {signedIn && <AppPrimaryNav />}
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          {signedIn ? (
            <>
              <Link href="/profile" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
                Profile
              </Link>
              <Link href="/setup" className="game-btn-ghost text-sm px-3 py-1.5 text-white font-bold">
                Setup
              </Link>
              <SignOutButton />
            </>
          ) : (
            <SignInButton providers={authProviders} />
          )}
          <AudioToggle />
        </nav>
      </div>
    </header>
  )
}
