import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Providers from '@/components/Providers'

const fredoka = localFont({
  variable: '--font-fredoka',
  src: [
    { path: './fonts/fredoka-hebrew.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fredoka-latin-ext.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fredoka-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fredoka-hebrew.woff2', weight: '600', style: 'normal' },
    { path: './fonts/fredoka-latin-ext.woff2', weight: '600', style: 'normal' },
    { path: './fonts/fredoka-latin.woff2', weight: '600', style: 'normal' },
  ],
})

const nunito = localFont({
  variable: '--font-nunito',
  src: [
    { path: './fonts/nunito-cyrillic-ext.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-cyrillic.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-vietnamese.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-latin-ext.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-latin.woff2', weight: '700', style: 'normal' },
    { path: './fonts/nunito-cyrillic-ext.woff2', weight: '800', style: 'normal' },
    { path: './fonts/nunito-cyrillic.woff2', weight: '800', style: 'normal' },
    { path: './fonts/nunito-vietnamese.woff2', weight: '800', style: 'normal' },
    { path: './fonts/nunito-latin-ext.woff2', weight: '800', style: 'normal' },
    { path: './fonts/nunito-latin.woff2', weight: '800', style: 'normal' },
  ],
})

export const metadata: Metadata = {
  title: 'Claude Leaderboard',
  description: 'Track your team\'s AI coding usage',
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
