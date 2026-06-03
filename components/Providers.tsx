'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { createAppQueryClient } from '@/lib/client-query'
import AudioUnlockProvider from './AudioUnlockProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createAppQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AudioUnlockProvider />
        {children}
      </SessionProvider>
    </QueryClientProvider>
  )
}
