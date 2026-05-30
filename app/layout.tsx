import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'], weight: ['400', '600'] })
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], weight: ['700', '800'] })

export const metadata: Metadata = {
  title: 'Claude Leaderboard',
  description: 'Track your team\'s Claude Code usage',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-sans)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
