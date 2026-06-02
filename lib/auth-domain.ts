import type { Account, Profile } from '@auth/core/types'

export type DomainRestrictionReason =
  | 'missing_email'
  | 'unverified_google_email'
  | 'email_domain_mismatch'
  | 'hosted_domain_mismatch'

export interface DomainAccessDecision {
  allowed: boolean
  reason: DomainRestrictionReason | null
  allowedDomain: string | null
  provider: string | null
  normalizedEmail: string | null
  emailVerified: boolean | null
  hostedDomain: string | null
}

interface DomainAccessInput {
  allowedEmailDomain?: string | null
  account?: Pick<Account, 'provider'> | null
  profile?: Pick<Profile, 'email' | 'email_verified'> & { hd?: unknown }
  userEmail?: string | null
}

export function normalizeAllowedEmailDomain(value?: string | null): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function normalizeEmail(value?: string | null): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function matchesAllowedDomain(email: string | null, allowedDomain: string): boolean {
  return email?.endsWith(`@${allowedDomain}`) ?? false
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return null

  return `${localPart.slice(0, 2)}***@${domain}`
}

export function evaluateDomainAccess({
  allowedEmailDomain,
  account,
  profile,
  userEmail,
}: DomainAccessInput): DomainAccessDecision {
  const allowedDomain = normalizeAllowedEmailDomain(allowedEmailDomain)
  const provider = account?.provider ?? null
  const normalizedEmail = normalizeEmail(profile?.email ?? userEmail ?? null)
  const hostedDomain = normalizeAllowedEmailDomain(
    typeof profile?.hd === 'string' ? profile.hd : null,
  )
  const emailVerified =
    provider === 'google'
      ? profile?.email_verified === true
      : typeof profile?.email_verified === 'boolean'
        ? profile.email_verified
        : null

  if (!allowedDomain) {
    return {
      allowed: true,
      reason: null,
      allowedDomain: null,
      provider,
      normalizedEmail,
      emailVerified,
      hostedDomain,
    }
  }

  if (provider === 'google') {
    if (!emailVerified) {
      return {
        allowed: false,
        reason: 'unverified_google_email',
        allowedDomain,
        provider,
        normalizedEmail,
        emailVerified,
        hostedDomain,
      }
    }

    if (matchesAllowedDomain(normalizedEmail, allowedDomain) || hostedDomain === allowedDomain) {
      return {
        allowed: true,
        reason: null,
        allowedDomain,
        provider,
        normalizedEmail,
        emailVerified,
        hostedDomain,
      }
    }

    return {
      allowed: false,
      reason:
        normalizedEmail || hostedDomain
          ? hostedDomain && hostedDomain !== allowedDomain
            ? 'hosted_domain_mismatch'
            : 'email_domain_mismatch'
          : 'missing_email',
      allowedDomain,
      provider,
      normalizedEmail,
      emailVerified,
      hostedDomain,
    }
  }

  if (matchesAllowedDomain(normalizedEmail, allowedDomain)) {
    return {
      allowed: true,
      reason: null,
      allowedDomain,
      provider,
      normalizedEmail,
      emailVerified,
      hostedDomain,
    }
  }

  return {
    allowed: false,
    reason: normalizedEmail ? 'email_domain_mismatch' : 'missing_email',
    allowedDomain,
    provider,
    normalizedEmail,
    emailVerified,
    hostedDomain,
  }
}

export function getAccessDeniedMessage(allowedEmailDomain?: string | null): string {
  const allowedDomain = normalizeAllowedEmailDomain(allowedEmailDomain)
  if (!allowedDomain) return 'Access denied. Please try again or contact your admin.'
  return `Access denied. Only @${allowedDomain} accounts can sign in.`
}
