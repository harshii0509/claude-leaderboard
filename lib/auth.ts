import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { supabaseAdmin } from './db'
import { ensureSyncCredential } from './sync-auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/auth',
  trustHost: true,
  pages: { error: '/' },
  logger: {
    error(error: Error & { cause?: unknown }) {
      console.error('[auth][debug]', error.message, error.cause)
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  callbacks: {
    async signIn({ user }) {
      // If ALLOWED_EMAIL_DOMAIN is set, restrict sign-in to that domain only
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
      if (allowedDomain && !user.email?.endsWith(`@${allowedDomain}`)) {
        return false
      }

      if (!user.id) return true
      await supabaseAdmin
        .from('user_stats')
        .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      await ensureSyncCredential(user.id)
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
