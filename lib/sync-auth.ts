import { supabaseAdmin } from './db'
import { ensureInstanceMembership } from './instance-membership'

const INSTALL_TOKEN_TTL_MINUTES = 15

export async function ensureSyncCredential(userId: string): Promise<string> {
  const membership = await ensureInstanceMembership(userId)
  if (!membership.is_active) {
    throw new Error('sync credential lookup failed: user is inactive')
  }

  const { data, error } = await supabaseAdmin.rpc('ensure_sync_credential', {
    p_user_id: userId,
  })

  if (error || typeof data !== 'string' || !data) {
    throw new Error(`sync credential lookup failed: ${error?.message ?? 'missing sync token'}`)
  }

  return data
}

export async function issueInstallToken(userId: string): Promise<string> {
  const membership = await ensureInstanceMembership(userId)
  if (!membership.is_active) {
    throw new Error('install token creation failed: user is inactive')
  }

  const expiresAt = new Date(Date.now() + INSTALL_TOKEN_TTL_MINUTES * 60_000).toISOString()
  const { data, error } = await supabaseAdmin.rpc('issue_install_token', {
    p_user_id: userId,
    p_expires_at: expiresAt,
  })

  if (error || typeof data !== 'string' || !data) {
    throw new Error(`install token creation failed: ${error?.message ?? 'missing install token'}`)
  }

  return data
}

export async function consumeInstallToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('consume_install_token', {
    p_token: token,
  })

  if (error) {
    throw new Error(`install token consume failed: ${error.message}`)
  }

  if (data == null) {
    return null
  }

  if (typeof data !== 'string' || !data) {
    throw new Error('install token consume failed: missing sync token')
  }

  return data
}

export async function getUserIdForSyncToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('get_user_id_for_sync_token', {
    p_sync_token: token,
  })

  if (error) {
    throw new Error(`sync token lookup failed: ${error.message}`)
  }

  if (data == null) {
    return null
  }

  if (typeof data !== 'string' || !data) {
    throw new Error('sync token lookup failed: missing user id')
  }

  return data
}
