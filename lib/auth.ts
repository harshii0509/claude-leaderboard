import NextAuth from 'next-auth'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { supabaseAdmin } from './db'
import { ensureSyncCredential } from './sync-auth'
import { getEnabledAuthProviders } from './auth-providers'
import { evaluateDomainAccess, maskEmail } from './auth-domain'

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
      const accessDecision = evaluateDomainAccess({
        allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN,
        account,
        profile,
        userEmail: user.email,
      })

      if (!accessDecision.allowed) {
        console.warn('[auth][domain-restriction]', {
          provider: accessDecision.provider,
          allowedDomain: accessDecision.allowedDomain,
          email: maskEmail(accessDecision.normalizedEmail),
          hasEmail: Boolean(accessDecision.normalizedEmail),
          emailVerified: accessDecision.emailVerified,
          hasHostedDomain: Boolean(accessDecision.hostedDomain),
          hostedDomain: accessDecision.hostedDomain,
          reason: accessDecision.reason,
        })
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
