import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import CopyButton from '@/app/setup/CopyButton'
import { requireActiveSession } from '@/lib/access'
import { isUserOnboardingEligible } from '@/lib/onboarding'
import { getRequestOriginFromHeaders, resolveAppUrl } from '@/lib/request-context'

export default async function WelcomePage() {
  const { session } = await requireActiveSession()
  const onboardingEligible = await isUserOnboardingEligible(session.user.id)

  if (!onboardingEligible) {
    redirect('/')
  }

  const headerStore = await headers()
  const appUrl = resolveAppUrl(getRequestOriginFromHeaders(headerStore))

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

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
        <section className="game-card w-full p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
            You&apos;re In
          </p>
          <h1
            className="mt-2 text-4xl leading-none text-[var(--color-text)] md:text-5xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Signed in successfully.
            <br />
            Finish setup on your computer.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
            Your account is ready. The next step happens on desktop, where we&apos;ll show your
            personal setup command.
          </p>

          <div className="mt-6 rounded-[22px] border-2 border-[var(--color-border)] bg-white p-5 shadow-[0_6px_0_-2px_var(--color-border)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Open this on your laptop
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 break-all rounded-[16px] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)]">
                {appUrl}
              </code>
              <CopyButton text={appUrl} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              Open this on the computer where Claude Code or Codex already lives. We&apos;ll take
              first-time users straight to setup there.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
              <p className="text-sm font-bold text-[var(--color-text)]">1. Open the app on desktop</p>
            </div>
            <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
              <p className="text-sm font-bold text-[var(--color-text)]">
                2. Run the single Claude + Codex setup command
              </p>
            </div>
            <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 shadow-[0_5px_0_-2px_var(--color-border)]">
              <p className="text-sm font-bold text-[var(--color-text)]">3. Show up on the board</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/setup" className="game-btn px-4 py-2 font-bold text-black">
              I&apos;m already on desktop
            </Link>
            <Link href="/" className="font-bold text-[var(--color-text)] underline underline-offset-2">
              Back to leaderboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
