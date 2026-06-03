'use client'

import { useEffect, useState } from 'react'
import { fetchPublicWidgetData } from './fetchPublicWidgetData'
import { LeaderboardWidgetFromData } from './LeaderboardWidgetFromData'
import type { PublicWidgetData, WidgetPreset } from './types'

export interface LeaderboardWidgetProps {
  publicId: string
  baseUrl: string
  preset?: WidgetPreset
  className?: string
}

export function LeaderboardWidget({
  publicId,
  baseUrl,
  preset,
  className,
}: LeaderboardWidgetProps) {
  const [data, setData] = useState<PublicWidgetData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchPublicWidgetData(baseUrl, publicId)
      .then((nextData) => {
        if (cancelled) return
        setData(nextData)
        setError(null)
      })
      .catch((fetchError) => {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load widget.')
      })

    return () => {
      cancelled = true
    }
  }, [baseUrl, publicId])

  if (error) {
    return <WidgetMessage className={className} title="Widget unavailable" body={error} />
  }

  if (!data) {
    return <WidgetMessage className={className} title="Loading activity" body="Fetching the latest activity widget…" />
  }

  return <LeaderboardWidgetFromData data={data} preset={preset} className={className} />
}

function WidgetMessage({
  className,
  title,
  body,
}: {
  className?: string
  title: string
  body: string
}) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 24,
        border: '1px solid rgba(15, 23, 42, 0.12)',
        background: '#f8fbff',
        padding: 20,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
        color: '#0f172a',
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>
        {title}
      </div>
      <div style={{ marginTop: 8, fontSize: 14 }}>{body}</div>
    </div>
  )
}
