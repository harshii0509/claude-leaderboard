'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="game-btn shrink-0 text-xs px-3 py-1.5 text-black font-bold"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
