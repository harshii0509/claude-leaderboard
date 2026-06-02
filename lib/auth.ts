import NextAuth from 'next-auth'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { supabaseAdmin } from './db'
import { getEnabledAuthProviders } from './auth-providers'
import { authorizeSignIn } from './auth-domain'
import { ensureInstanceMembership } from './instance-membership'

const providers = getEnabledAuthProviders()

if (providers.length === 0) {
  throw new Error(
    'No auth providers configured. Set Google or GitHub OAuth environment variables before starting the app.',
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/auth',
  trustHost: true,
  pages: { error: '/' },
  logger: {
    error(error: Error & { cause?: unknown }) {
      console.error('[auth][debug]', error.message, error.cause)
    },
  },
  providers,
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  callbacks: {
    async signIn({ user, account, profile }) {
      return authorizeSignIn(
        {
          allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN,
          account,
          profile,
          userId: user.id,
          userEmail: user.email,
        },
        {
          ensureMembership: ensureInstanceMembership,
          async upsertUserStats(userId) {
            const { error } = await supabaseAdmin
              .from('user_stats')
              .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

            if (error) throw new Error(error.message)
          },
        },
      )
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
