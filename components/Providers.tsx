'use client'

import { SessionProvider } from 'next-auth/react'
import AudioUnlockProvider from './AudioUnlockProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AudioUnlockProvider />
      {children}
    </SessionProvider>
  )
}
