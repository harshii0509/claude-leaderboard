import { auth } from '@/lib/auth'
import { getEnabledAuthProviderOptions } from '@/lib/auth-providers'
import { getTeamInsights } from '@/lib/insights'
import AppHeader from '@/components/AppHeader'
import InsightsClient from '@/components/InsightsClient'

export default async function InsightsPage() {
  const [session, insightsResult] = await Promise.all([
    auth(),
    getTeamInsights('all')
      .then((data) => ({ data, failed: false }))
      .catch(() => ({ data: null, failed: true })),
  ])
  const authProviders = getEnabledAuthProviderOptions()

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

      <AppHeader signedIn={Boolean(session)} authProviders={authProviders} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-12">
        <InsightsClient
          initialInsights={insightsResult.data}
          initialLoadFailed={insightsResult.failed}
        />
      </main>
    </div>
  )
}
