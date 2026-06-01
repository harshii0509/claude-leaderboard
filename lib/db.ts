import { createClient, SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseAnon(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function createBoundProxy(clientFactory: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = clientFactory()
      const value = client[prop as keyof SupabaseClient]
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    },
  })
}

// Convenience aliases used in route handlers
export const supabaseAnon = createBoundProxy(() => getSupabaseAnon())
export const supabaseAdmin = createBoundProxy(() => getSupabaseAdmin())
