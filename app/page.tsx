import { auth } from '@/lib/auth'
import LeaderboardClient from '@/components/LeaderboardClient'
import { LeaderboardEntry } from '@/components/Podium'
import Link from 'next/link'

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${appUrl}/api/leaderboard?sort=tokens&period=all`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [session, initialData] = await Promise.all([auth(), getLeaderboard()])

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">Claude Leaderboard</h1>
            <p className="text-xs text-[var(--color-muted)]">Track your team&apos;s Claude Code usage</p>
          </div>
          <nav className="flex items-center gap-3">
            {session ? (
              <>
                <Link href="/profile" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                  Profile
                </Link>
                <Link href="/setup" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
                  Setup
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="text-sm px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <LeaderboardClient initialData={initialData} />
      </main>
    </div>
  )
}
