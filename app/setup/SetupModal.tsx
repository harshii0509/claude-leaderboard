'use client'
import { useRouter } from 'next/navigation'

export default function SetupModal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="backdrop-in absolute inset-0 bg-[var(--color-border)]/60 backdrop-blur-sm"
        onClick={() => router.back()}
      />
      {/* Modal card */}
      <div className="modal-pop game-card relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Setup
          </h1>
          <button
            onClick={() => router.back()}
            className="game-btn-icon w-9 h-9 text-[var(--color-muted)] font-bold text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
