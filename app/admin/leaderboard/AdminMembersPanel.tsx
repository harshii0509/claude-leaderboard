'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { InstanceMemberSummary } from '@/lib/instance-membership'
import type { InstanceRole } from '@/lib/membership-rules'

interface AdminMembersPanelProps {
  currentUserId: string
  currentUserRole: InstanceRole
  members: InstanceMemberSummary[]
}

function badgeClass(role: InstanceRole) {
  if (role === 'owner') return 'bg-[#f5c842] border-[#b8900a] text-[#5a3c00]'
  if (role === 'admin') return 'bg-[#c8d4e0] border-[#7a90a8] text-[#2a3a4a]'
  return 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]'
}

function fmtDeactivatedAt(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Deactivated'
  return `Deactivated ${date.toLocaleDateString()}`
}

export default function AdminMembersPanel({
  currentUserId,
  currentUserRole,
  members,
}: AdminMembersPanelProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, startTransition] = useTransition()

  async function runAction(action: string, targetUserId: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return

    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/members', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, targetUserId }),
        })

        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload && typeof payload.error === 'string' ? payload.error : 'Action failed')
        }

        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  async function runHardDelete(target: InstanceMemberSummary) {
    const expected = target.email ?? target.name ?? target.user_id
    const typed = window.prompt(`Type "${expected}" to permanently delete this account and all stored history.`)
    if (typed !== expected) return
    await runAction('hard_delete', target.user_id, 'This permanently deletes the account and synced history. Continue?')
  }

  return (
    <div className="game-card p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-[var(--color-text)] font-semibold">Instance members</p>
          <p className="text-sm text-[var(--color-muted)]">
            Owners transfer control, admins manage members, and deactivated users are hidden from the live leaderboard.
          </p>
        </div>
        <div className="text-xs text-[var(--color-muted)] font-bold">
          Your role: {currentUserRole}
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] border border-[var(--color-red)]/40 bg-[var(--color-red)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--color-muted)] uppercase tracking-wider text-xs">
              <th className="pb-3 pr-4">Member</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Last Sync</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId
              const deactivatedLabel = fmtDeactivatedAt(member.deactivated_at)
              const canOwnerManage = currentUserRole === 'owner' && !isSelf && member.role !== 'owner'
              const canAdminManage = currentUserRole === 'admin' && !isSelf && member.role === 'member'
              const canManage = canOwnerManage || canAdminManage

              return (
                <tr key={member.user_id} className="border-t border-[var(--color-border)]/15 text-[var(--color-text)] align-top">
                  <td className="py-3 pr-4">
                    <div className="font-semibold">{member.name ?? 'Unknown user'}</div>
                    <div className="text-[var(--color-muted)] text-xs mt-1">{member.email ?? 'No email'}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${badgeClass(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold">{member.is_active ? 'Active' : 'Deactivated'}</div>
                    {deactivatedLabel && (
                      <div className="text-[var(--color-muted)] text-xs mt-1">{deactivatedLabel}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-muted)]">
                    {member.last_synced_at ? new Date(member.last_synced_at).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {currentUserRole === 'owner' && member.role === 'member' && member.is_active && !isSelf && (
                        <button
                          type="button"
                          disabled={pendingAction}
                          onClick={() => runAction('promote', member.user_id)}
                          className="game-btn text-xs px-3 py-1.5 text-black font-bold disabled:opacity-50"
                        >
                          Make admin
                        </button>
                      )}
                      {currentUserRole === 'owner' && member.role === 'admin' && member.is_active && !isSelf && (
                        <>
                          <button
                            type="button"
                            disabled={pendingAction}
                            onClick={() => runAction('demote', member.user_id)}
                            className="game-btn-ghost text-xs px-3 py-1.5 text-white font-bold disabled:opacity-50"
                          >
                            Demote
                          </button>
                          <button
                            type="button"
                            disabled={pendingAction}
                            onClick={() => runAction('transfer_ownership', member.user_id, 'Transfer ownership? Your account will become an admin.')}
                            className="game-btn text-xs px-3 py-1.5 text-black font-bold disabled:opacity-50"
                          >
                            Transfer ownership
                          </button>
                        </>
                      )}
                      {canManage && member.is_active && (
                        <button
                          type="button"
                          disabled={pendingAction}
                          onClick={() => runAction('deactivate', member.user_id, 'Deactivate this user and hide them from the live leaderboard?')}
                          className="game-btn-ghost text-xs px-3 py-1.5 text-white font-bold disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                      {canManage && !member.is_active && (
                        <button
                          type="button"
                          disabled={pendingAction}
                          onClick={() => runAction('reactivate', member.user_id)}
                          className="game-btn text-xs px-3 py-1.5 text-black font-bold disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          disabled={pendingAction}
                          onClick={() => runHardDelete(member)}
                          className="game-btn-red text-xs px-3 py-1.5 text-white font-bold disabled:opacity-50"
                        >
                          Hard delete
                        </button>
                      )}
                      {isSelf && (
                        <span className="text-xs text-[var(--color-muted)] font-bold">You</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
