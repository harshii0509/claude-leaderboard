import Link from 'next/link'
import { redirect } from 'next/navigation'
import ErrorToast from '@/components/ErrorToast'
import SignInButton from '@/components/SignInButton'
import { getEnabledAuthProviderOptions } from '@/lib/auth-providers'
import { auth } from '@/lib/auth'
import { getAccessDeniedMessage, type DomainRestrictionReason } from '@/lib/auth-domain'
import { getJoinFlowRedirectPath, isUserOnboardingEligible } from '@/lib/onboarding'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const session = await auth()

  if (session?.user?.id) {
    const onboardingEligible = await isUserOnboardingEligible(session.user.id)
    redirect(getJoinFlowRedirectPath(onboardingEligible))
  }

  const errorCode = typeof params?.error === 'string' ? params.error : null
  const accessDeniedReason =
    typeof params?.reason === 'string' ? (params.reason as DomainRestrictionReason) : null
  const accessDeniedMessage = getAccessDeniedMessage(process.env.ALLOWED_EMAIL_DOMAIN, accessDeniedReason, {
    provider: typeof params?.provider === 'string' ? params.provider : null,
    emailDomain: typeof params?.email_domain === 'string' ? params.email_domain : null,
    hostedDomain: typeof params?.hosted_domain === 'string' ? params.hosted_domain : null,
    emailVerified: typeof params?.email_verified === 'string' ? params.email_verified : null,
  })
  const providers = getEnabledAuthProviderOptions()

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
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

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="game-card p-6 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Phone-First Join
            </p>
            <h1
              className="mt-2 text-4xl leading-none text-[var(--color-text)] md:text-5xl"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Sign in here.
              <br />
              Finish setup on your computer.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-muted)]">
              You&apos;re joining the live leaderboard from a public screen. Sign in now and
              we&apos;ll hand you off to the right desktop step next.
            </p>

            <div className="mt-6">
              <SignInButton
                providers={providers}
                callbackUrl="/join"
                containerClassName="flex-col items-stretch sm:flex-row"
                buttonClassName="justify-center px-5 py-3 text-base"
              />
            </div>

            <div className="mt-6 rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
              <p className="text-sm font-bold text-[var(--color-text)]">This page does two things only</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-muted)]">
                <li>Confirm you belong on this leaderboard.</li>
                <li>Send you to a clean desktop handoff after sign-in.</li>
              </ol>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm text-[var(--color-muted)]">
              <Link href="/" className="font-bold text-[var(--color-text)] underline underline-offset-2">
                Back to leaderboard
              </Link>
              <span aria-hidden="true">•</span>
              <span>Setup runs on your own machine, not on mobile.</span>
            </div>
          </section>

          <section className="game-card flex flex-col justify-between p-6 md:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
                What Happens Next
              </p>
              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-white p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
                  <p className="text-sm font-bold text-[var(--color-text)]">1. Sign in now</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    Use your approved account so we know who should appear on the board.
                  </p>
                </div>
                <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-white p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
                  <p className="text-sm font-bold text-[var(--color-text)]">2. Switch to desktop</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                    We&apos;ll show you the exact URL and next step there instead of making you hunt
                    through the app.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[var(--color-muted)]">
              Setup stays on your machine. This phone step is just the fast way into the flow from
              a public screen.
            </p>
          </section>
        </div>
      </main>

      <ErrorToast error={errorCode} accessDeniedMessage={accessDeniedMessage} />
    </div>
  )
}
