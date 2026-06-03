'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PRIMARY_LINKS = [
  { href: '/', label: 'Leaderboard' },
  { href: '/insights', label: 'Insights' },
] as const

export default function AppPrimaryNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRIMARY_LINKS.map((link) => {
        const isActive = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`game-tab ${isActive ? 'game-tab-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
