import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _anon: SupabaseClient | null = null
let _admin: SupabaseClient | null = null

export function getSupabaseAnon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'placeholder'
    )
  }
  return _anon
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return _admin
}

// Convenience aliases used in route handlers
export const supabaseAnon = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAnon() as any)[prop]
  },
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})
