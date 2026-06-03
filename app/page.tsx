import { auth } from '@/lib/auth'
import LeaderboardClient from '@/components/LeaderboardClient'
import ErrorToast from '@/components/ErrorToast'
import { getLeaderboardView } from '@/lib/leaderboard'
import { getEnabledAuthProviderOptions } from '@/lib/auth-providers'
import { getAccessDeniedMessage, type DomainRestrictionReason } from '@/lib/auth-domain'
import AppHeader from '@/components/AppHeader'
import JoinRail from '@/components/JoinRail'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getHomeRedirectPath, isUserOnboardingEligible } from '@/lib/onboarding'
import {
  getRequestOriginFromHeaders,
  isLikelyMobileUserAgent,
  resolveAppUrl,
} from '@/lib/request-context'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const errorCode = typeof params?.error === 'string' ? params.error : null
  const accessDeniedReason =
    typeof params?.reason === 'string' ? (params.reason as DomainRestrictionReason) : null
  const headerStore = await headers()
  const appUrl = resolveAppUrl(getRequestOriginFromHeaders(headerStore))
  const session = await auth()

  if (session?.user?.id) {
    const redirectPath = getHomeRedirectPath({
      onboardingEligible: await isUserOnboardingEligible(session.user.id),
      isMobile: isLikelyMobileUserAgent(headerStore.get('user-agent')),
    })

    if (redirectPath) {
      redirect(redirectPath)
    }
  }

  const accessDeniedMessage = getAccessDeniedMessage(process.env.ALLOWED_EMAIL_DOMAIN, accessDeniedReason, {
    provider: typeof params?.provider === 'string' ? params.provider : null,
    emailDomain: typeof params?.email_domain === 'string' ? params.email_domain : null,
    hostedDomain: typeof params?.hosted_domain === 'string' ? params.hosted_domain : null,
    emailVerified: typeof params?.email_verified === 'string' ? params.email_verified : null,
  })
  const leaderboardResult = await getLeaderboardView('weekly', 'week')
    .then((data) => ({ data, failed: false }))
    .catch(() => ({ data: null, failed: true }))
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
      <AppHeader signedIn={Boolean(session)} authProviders={authProviders} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-6 pb-12 md:pt-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <LeaderboardClient
              initialData={leaderboardResult.data}
              initialLoadFailed={leaderboardResult.failed}
              signedIn={Boolean(session)}
            />
          </div>
          <JoinRail appUrl={appUrl} />
        </div>
      </main>
      <ErrorToast error={errorCode} accessDeniedMessage={accessDeniedMessage} />
    </div>
  )
}
