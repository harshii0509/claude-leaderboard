import Link from 'next/link'

export default function NotFound() {
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

      <header className="relative z-10 py-4 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/">
            <h1
              className="text-2xl text-white tracking-tight leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textShadow: '0px 1px 0px rgba(0,0,50,0.25)',
              }}
            >
              Claude Leaderboard
            </h1>
          </Link>
          <p className="text-xs text-white/65 mt-0.5 font-bold">Track your team&apos;s AI coding usage</p>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-88px)] px-4">
        <div
          className="game-card p-8 max-w-md w-full text-center"
          style={{ animation: 'bounce-in 0.45s ease both' }}
        >
          <div
            className="text-[var(--color-accent)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '7rem',
              lineHeight: 1,
              textShadow: '0px 4px 0px rgba(32,76,23,0.35)',
            }}
          >
            404
          </div>

          <h2
            className="text-3xl text-[var(--color-text)] mt-2"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Quest Not Found
          </h2>

          <p className="text-[var(--color-muted)] mt-3 font-bold text-sm leading-relaxed">
            Looks like this page respawned somewhere else.
            <br />
            Don&apos;t worry — your stats are safe.
          </p>

          <Link href="/" className="game-btn inline-block mt-6 px-6 py-3 font-bold text-sm">
            Back to Leaderboard
          </Link>
        </div>
      </main>
    </div>
  )
}
