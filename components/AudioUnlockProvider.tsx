'use client'

import { useEffect } from 'react'
import { unlockAudio } from '@/lib/audio'

export default function AudioUnlockProvider() {
  useEffect(() => {
    let active = true

    const cleanup = () => {
      window.removeEventListener('pointerdown', handleUnlock, true)
      window.removeEventListener('keydown', handleUnlock, true)
      window.removeEventListener('touchstart', handleUnlock, true)
    }

    const handleUnlock = () => {
      if (!active) return

      void unlockAudio().then((unlocked) => {
        if (!active) return
        if (unlocked) cleanup()
      })
    }

    window.addEventListener('pointerdown', handleUnlock, true)
    window.addEventListener('keydown', handleUnlock, true)
    window.addEventListener('touchstart', handleUnlock, true)

    return () => {
      active = false
      cleanup()
    }
  }, [])

  return null
}
