import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/db'
import CopyButton from './CopyButton'
import SetupModal from './SetupModal'

async function getSyncToken(userId: string): Promise<string | null> {
  // Provision row if it doesn't exist (fallback for users who pre-date the signIn callback)
  await supabaseAdmin
    .from('user_stats')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  const { data } = await supabaseAdmin
    .from('user_stats')
    .select('sync_token')
    .eq('user_id', userId)
    .single()
  return data?.sync_token ?? null
}

export default async function SetupPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const token = await getSyncToken(session.user.id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const installCmd = token ? `curl -fsSL ${appUrl}/api/install/${token} | bash` : null

  return (
    <div
      className="min-h-screen bg-[var(--color-background)]"
      style={{
        backgroundImage: `url('/bg.png')`,
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
      }}
    >
      <SetupModal>
        {/* Description */}
        <p className="text-sm text-[var(--color-muted)] leading-relaxed -mt-1">
          Run the one-line command below to install the Claude Stop hook on your machine.
          It will automatically sync your usage stats after every Claude session.
        </p>

        {/* Install command */}
        {installCmd ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">Install command</p>
            <div className="flex items-center gap-3 bg-[var(--color-surface-2)] rounded-[16px] px-4 py-3">
              <code className="flex-1 text-sm text-[var(--color-text)] font-mono break-all">{installCmd}</code>
              <CopyButton text={installCmd} />
            </div>
          </div>
        ) : (
          <div className="bg-[var(--color-surface-2)] rounded-[16px] p-4 text-sm text-[var(--color-muted)]">
            Could not load your sync token. Please sign out and sign in again.
          </div>
        )}

        {/* What the script does */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-bold">What the script does</p>
          <ol className="list-decimal list-inside flex flex-col gap-2 text-sm text-[var(--color-muted)]">
            <li>Downloads <code className="text-[var(--color-text)] font-mono">sync.py</code> to <code className="text-[var(--color-text)] font-mono">~/.claude/</code></li>
            <li>Writes your personal sync token to <code className="text-[var(--color-text)] font-mono">~/.claude/sync_config.json</code></li>
            <li>Registers a <strong className="text-[var(--color-text)]">Stop hook</strong> in <code className="text-[var(--color-text)] font-mono">~/.claude/settings.json</code></li>
          </ol>
          <p className="text-sm text-[var(--color-muted)]">
            After installation, Claude will run <code className="text-[var(--color-text)] font-mono">python3 ~/.claude/sync.py</code> automatically at the end of every session.
            You can also run it manually at any time.
          </p>
        </div>
      </SetupModal>
    </div>
  )
}
