'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import ActivityWidget from './ActivityWidget'
import type { DayData } from './ActivityHeatmap'
import { clientQueryKeys, fetchApiJson } from '@/lib/client-query'
import { buildIframeEmbedSnippet, buildPublicWidgetApiUrl, buildPublicWidgetUrl, buildReactEmbedSnippet } from '@/lib/widget-embed'
import {
  WIDGET_PRESETS,
  type UserWidgetSettings,
  type WidgetPreset,
} from '@/lib/widget-types'

interface ProfileWidgetPanelProps {
  initialSettings: UserWidgetSettings
  displayName: string
  image: string | null
  currentStreak: number
  activity: DayData[]
}

interface WidgetSettingsResponse {
  settings: UserWidgetSettings
}

export default function ProfileWidgetPanel({
  initialSettings,
  displayName,
  image,
  currentStreak,
  activity,
}: ProfileWidgetPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [clipboardError, setClipboardError] = useState<string | null>(null)
  const [origin, setOrigin] = useState('http://localhost:3000')
  const queryClient = useQueryClient()

  const widgetSettingsQuery = useQuery<UserWidgetSettings>({
    queryKey: clientQueryKeys.widgetSettings(),
    queryFn: async () => {
      const body = await fetchApiJson<WidgetSettingsResponse>(
        '/api/profile/widget',
        'Could not load widget settings',
      )

      if (!body.settings) {
        throw new Error('Could not load widget settings.')
      }

      return body.settings
    },
    initialData: initialSettings,
  })

  const updateSettingsMutation = useMutation({
    mutationFn: async (
      payload: Partial<{ isPublished: boolean; preset: WidgetPreset; regeneratePublicId: boolean }>,
    ) => {
      const body = await fetchApiJson<{ error?: string } & Partial<WidgetSettingsResponse>>(
        '/api/profile/widget',
        'Could not update widget settings',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!body.settings) {
        throw new Error(body.error ?? 'Could not update widget settings.')
      }

      return body.settings
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(clientQueryKeys.widgetSettings(), settings)
      setClipboardError(null)
    },
  })

  const settings = widgetSettingsQuery.data ?? initialSettings
  const pending = updateSettingsMutation.isPending
  const error =
    clipboardError ??
    (updateSettingsMutation.error instanceof Error ? updateSettingsMutation.error.message : null) ??
    (widgetSettingsQuery.error instanceof Error ? widgetSettingsQuery.error.message : null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!copiedKey) return
    const timeout = window.setTimeout(() => setCopiedKey(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [copiedKey])

  const iframeSnippet = useMemo(
    () => buildIframeEmbedSnippet(origin, settings.public_id, settings.preset),
    [origin, settings.public_id, settings.preset],
  )
  const widgetUrl = useMemo(
    () => buildPublicWidgetUrl(origin, settings.public_id, settings.preset),
    [origin, settings.public_id, settings.preset],
  )
  const apiUrl = useMemo(
    () => buildPublicWidgetApiUrl(origin, settings.public_id),
    [origin, settings.public_id],
  )
  const reactSnippet = useMemo(
    () => buildReactEmbedSnippet(origin, settings.public_id, settings.preset),
    [origin, settings.public_id, settings.preset],
  )

  async function sendUpdate(payload: Partial<{ isPublished: boolean; preset: WidgetPreset; regeneratePublicId: boolean }>) {
    setClipboardError(null)
    updateSettingsMutation.mutate(payload)
  }

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setClipboardError(null)
    } catch {
      setClipboardError('Could not copy to clipboard.')
    }
  }

  return (
    <div className="game-card p-5 flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Widget sharing</p>
          <h2 className="text-xl text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Share your activity anywhere
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Publish an interactive activity widget for your site, Framer, or a future React package.
          </p>
        </div>

        <button
          type="button"
          className={settings.is_published ? 'game-btn-red text-sm px-4 py-2 text-white font-bold' : 'game-btn text-sm px-4 py-2 text-black font-bold'}
          disabled={pending}
          onClick={() => sendUpdate({ isPublished: !settings.is_published })}
        >
          {pending ? 'Saving...' : settings.is_published ? 'Unpublish widget' : 'Publish widget'}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <ActivityWidget
          displayName={displayName}
          image={image}
          currentStreak={currentStreak}
          totalActiveDays={activity.length}
          activity={activity}
          preset={settings.preset}
          branded
        />

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Preset</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {WIDGET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={pending}
                  className={`game-tab px-3 py-2 capitalize ${settings.preset === preset ? 'game-tab-active' : ''}`}
                  onClick={() => sendUpdate({ preset })}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)]/10 bg-[var(--color-surface-2)]/70 p-4">
            <p className="text-sm font-bold text-[var(--color-text)]">Public widget link</p>
            <p className="mt-1 break-all text-xs text-[var(--color-muted)]">{widgetUrl}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="game-btn text-xs px-3 py-2 text-black font-bold" onClick={() => copyText('link', widgetUrl)}>
                {copiedKey === 'link' ? 'Copied!' : 'Copy link'}
              </button>
              <button type="button" className="game-btn-ghost text-xs px-3 py-2 text-[var(--color-text)] font-bold" onClick={() => sendUpdate({ regeneratePublicId: true })}>
                Regenerate ID
              </button>
            </div>
          </div>

          <SnippetCard
            title="Embed snippet"
            subtitle="Paste this into any website or Framer Embed block."
            value={iframeSnippet}
            copied={copiedKey === 'iframe'}
            onCopy={() => copyText('iframe', iframeSnippet)}
            disabled={!settings.is_published}
          />

          <SnippetCard
            title="Public JSON"
            subtitle="Package-friendly data contract for future custom renderers."
            value={apiUrl}
            copied={copiedKey === 'api'}
            onCopy={() => copyText('api', apiUrl)}
            disabled={!settings.is_published}
          />

          <SnippetCard
            title="React starter"
            subtitle="Preview of the hosted-data API a React package can consume."
            value={reactSnippet}
            copied={copiedKey === 'react'}
            onCopy={() => copyText('react', reactSnippet)}
            disabled={!settings.is_published}
          />
        </div>
      </div>

      {settings.is_published ? (
        <p className="text-sm text-[var(--color-muted)]">
          Framer support is ready now through the iframe snippet. React/Next package support is backed by the public JSON contract above.
        </p>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          Your widget stays private until you publish it. Once published, the link and snippets above become live.
        </p>
      )}

      {error ? <p className="text-sm text-[var(--color-red)] font-bold">{error}</p> : null}
    </div>
  )
}

interface SnippetCardProps {
  title: string
  subtitle: string
  value: string
  copied: boolean
  disabled: boolean
  onCopy: () => void
}

function SnippetCard({ title, subtitle, value, copied, disabled, onCopy }: SnippetCardProps) {
  return (
    <div className={`rounded-2xl border p-4 ${disabled ? 'border-[var(--color-border)]/10 bg-[var(--color-surface-2)]/40 opacity-60' : 'border-[var(--color-border)]/10 bg-[var(--color-surface-2)]/70'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
          <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
        </div>
        <button type="button" className="game-btn text-xs px-3 py-2 text-black font-bold" disabled={disabled} onClick={onCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-white/70 p-3 text-[11px] leading-relaxed text-[var(--color-text)] whitespace-pre-wrap break-all">
        <code>{value}</code>
      </pre>
    </div>
  )
}
