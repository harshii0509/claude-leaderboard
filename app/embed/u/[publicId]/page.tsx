import type { Metadata } from 'next'
import ActivityWidget from '@/components/ActivityWidget'
import { getPublicActivityWidgetData } from '@/lib/user-widget'
import { isWidgetPreset, type WidgetPreset } from '@/lib/widget-types'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PublicWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>
  searchParams: Promise<{ preset?: string }>
}) {
  const [{ publicId }, query] = await Promise.all([params, searchParams])
  const widget = await getPublicActivityWidgetData(publicId)

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef5fb] px-6 text-center">
        <div className="max-w-sm rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.10)]">
          <p className="text-sm uppercase tracking-[0.24em] font-black text-slate-500">Widget unavailable</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
            This activity widget is not public right now.
          </h1>
        </div>
      </div>
    )
  }

  const preset = typeof query?.preset === 'string' && isWidgetPreset(query.preset)
    ? (query.preset as WidgetPreset)
    : widget.preset

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#d8ebff_0%,#f4f8fc_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <ActivityWidget
          displayName={widget.displayName}
          image={widget.image}
          currentStreak={widget.currentStreak}
          totalActiveDays={widget.totalActiveDays}
          activity={widget.activity}
          preset={preset}
          branded
        />
      </div>
    </div>
  )
}
