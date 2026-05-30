interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="game-card p-4 flex flex-col gap-1">
      <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">{label}</span>
      <span
        className="text-2xl font-extrabold text-[var(--color-text)]"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-[var(--color-muted)] font-bold">{sub}</span>}
    </div>
  )
}
