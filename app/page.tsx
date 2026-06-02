import { auth } from '@/lib/auth'
import LeaderboardClient from '@/components/LeaderboardClient'
import Link from 'next/link'
import AudioToggle from '@/components/AudioToggle'
import SignOutButton from '@/components/SignOutButton'
import SignInButton from '@/components/SignInButton'
import ErrorToast from '@/components/ErrorToast'
import { getLeaderboardData } from '@/lib/leaderboard'
import { getEnabledAuthProviderOptions } from '@/lib/auth-providers'
import { getAccessDeniedMessage, type DomainRestrictionReason } from '@/lib/auth-domain'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const errorCode = typeof params?.error === 'string' ? params.error : null
  const accessDeniedReason =
    typeof params?.reason === 'string' ? (params.reason as DomainRestrictionReason) : null
  const accessDeniedMessage = getAccessDeniedMessage(process.env.ALLOWED_EMAIL_DOMAIN, accessDeniedReason)
  const [session, leaderboardResult] = await Promise.all([
    auth(),
    getLeaderboardData('tokens', 'all')
      .then((data) => ({ data, failed: false }))
      .catch(() => ({ data: [], failed: true })),
  ])
  const authProviders = getEnabledAuthProviderOptions()

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Background texture pattern */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('/bg.png')`,
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          opacity: 0.5,
          mixBlendMode: 'overlay',
          zIndex: 0,
        }}
      />
      <header className="relative z-10 py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl text-white tracking-tight leading-tight text-balance"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textShadow: '0px 1px 0px rgba(0,0,50,0.25)',
              }}
            >
              Claude Leaderboard
            </h1>
            <p className="text-xs text-white/65 mt-0.5 font-bold">Track your team&apos;s Claude Code usage</p>
          </div>
          <nav className="flex items-center gap-2">
            {session ? (
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-12">
        <LeaderboardClient initialData={leaderboardResult.data} initialLoadFailed={leaderboardResult.failed} />
      </main>
      <ErrorToast error={errorCode} accessDeniedMessage={accessDeniedMessage} />
    </div>
  )
}
