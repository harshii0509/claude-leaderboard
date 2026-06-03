import QRCode from 'qrcode'
import { buildJoinUrl } from '@/lib/request-context'

interface JoinRailProps {
  appUrl: string
}

export default async function JoinRail({ appUrl }: JoinRailProps) {
  const joinUrl = buildJoinUrl(appUrl)
  const qrSvg = await QRCode.toString(joinUrl, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#1f2940',
      light: '#ffffff',
    },
  })

  return (
    <aside className="h-fit w-full lg:sticky lg:top-4 lg:h-fit lg:self-start lg:max-w-[20rem] xl:max-w-[22rem]">
      <div className="game-card overflow-visible p-5 md:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 -right-3 h-16 w-16 rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-gold)]"
          style={{ boxShadow: '0px 6px 0px -2px var(--color-gold-border)', transform: 'rotate(8deg)' }}
        >
          <div
            className="absolute inset-0 rounded-[18px]"
            style={{ boxShadow: 'inset 5px -10px 0px 0px rgba(255,255,255,0.22)' }}
          />
          <div className="relative flex h-full items-center justify-center text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#5a3c00]">
            Join
          </div>
        </div>

        <div className="relative flex flex-col gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Scan To Enter
            </p>
            <h2
              className="mt-1 text-3xl leading-none text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              Be part of the board.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
              See the race, scan on your phone, then finish setup on your own computer to start climbing.
            </p>
          </div>

          <div className="rounded-[24px] border-2 border-[var(--color-border)] bg-white p-4 shadow-[0_6px_0_-2px_var(--color-border)]">
            <div
              aria-label={`QR code for ${joinUrl}`}
              className="mx-auto aspect-square w-full max-w-[220px]"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <div className="rounded-[20px] border-2 border-[var(--color-border)] bg-[var(--color-accent)]/20 px-4 py-4 shadow-[0_5px_0_-2px_var(--color-border)]">
            <p className="text-sm font-bold text-[var(--color-text)]">Already on your own machine?</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
              Use the header sign-in. This rail is the phone-first path for people seeing the board publicly.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
