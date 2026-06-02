import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeSignIn } from '../lib/auth-domain.ts'

function createDependencies(overrides?: {
  ensureMembership?: (userId: string) => Promise<{
    user_id: string
    role: 'owner' | 'admin' | 'member'
    is_active: boolean
    deactivated_at: string | null
  }>
  upsertUserStats?: (userId: string) => Promise<void>
}) {
  return {
    ensureMembership:
      overrides?.ensureMembership ??
      (async (userId: string) => ({
        user_id: userId,
        role: 'member' as const,
        is_active: true,
        deactivated_at: null,
      })),
    upsertUserStats: overrides?.upsertUserStats ?? (async () => {}),
  }
}

test('authorizeSignIn redirects AccessDenied for domain mismatches', async () => {
  const result = await authorizeSignIn(
    {
      allowedEmailDomain: 'juspay.in',
      account: { provider: 'google' },
      profile: {
        email: 'person@gmail.com',
        email_verified: true,
      },
    },
    createDependencies(),
  )

  assert.equal(result, '/?error=AccessDenied&reason=email_domain_mismatch')
})

test('authorizeSignIn redirects MembershipInactive for inactive members', async () => {
  const result = await authorizeSignIn(
    {
      allowedEmailDomain: 'juspay.in',
      account: { provider: 'google' },
      profile: {
        email: 'person@juspay.in',
        email_verified: true,
      },
      userId: 'user-123',
    },
    createDependencies({
      ensureMembership: async (userId: string) => ({
        user_id: userId,
        role: 'member',
        is_active: false,
        deactivated_at: '2026-06-02T00:00:00.000Z',
      }),
    }),
  )

  assert.equal(result, '/?error=MembershipInactive')
})

test('authorizeSignIn allows sign-in when membership bootstrap fails operationally', async () => {
  const result = await authorizeSignIn(
    {
      allowedEmailDomain: 'juspay.in',
      account: { provider: 'google' },
      profile: {
        email: 'person@juspay.in',
        email_verified: true,
      },
      userId: 'user-123',
    },
    createDependencies({
      ensureMembership: async () => {
        throw new Error('Could not find the function public.ensure_instance_membership(p_user_id)')
      },
    }),
  )

  assert.equal(result, true)
})

test('authorizeSignIn allows first-time OAuth users before adapter persistence', async () => {
  const result = await authorizeSignIn(
    {
      allowedEmailDomain: 'juspay.in',
      account: { provider: 'google' },
      profile: {
        email: 'person@juspay.in',
        email_verified: true,
      },
      userId: undefined,
    },
    createDependencies(),
  )

  assert.equal(result, true)
})

test('authorizeSignIn does not block valid users on user_stats bootstrap failures', async () => {
  const result = await authorizeSignIn(
    {
      allowedEmailDomain: 'juspay.in',
      account: { provider: 'google' },
      profile: {
        email: 'person@juspay.in',
        email_verified: true,
      },
      userId: 'user-123',
    },
    createDependencies({
      upsertUserStats: async () => {
        throw new Error('duplicate key value violates unique constraint')
      },
    }),
  )

  assert.equal(result, true)
})
