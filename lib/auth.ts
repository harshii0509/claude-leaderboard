import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { supabaseAdmin } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/auth',
  trustHost: true,
  logger: {
    error(error: Error) {
      console.error('[auth][debug]', error.message, (error as any).cause)
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  }),
  callbacks: {
    async signIn({ user }) {
      // Only allow Juspay employees
      if (!user.email?.endsWith('@juspay.in')) {
        return false
      }

      if (!user.id) return true
      // Provision user_stats row with sync_token on first login
      await supabaseAdmin
        .from('user_stats')
        .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
