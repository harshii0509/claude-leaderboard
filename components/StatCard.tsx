interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex flex-col gap-1">
      <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold text-[var(--color-text)]">{value}</span>
      {sub && <span className="text-xs text-[var(--color-muted)]">{sub}</span>}
    </div>
  )
}
