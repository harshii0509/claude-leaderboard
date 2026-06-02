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
  allowedDomains: string[]
  provider: string | null
  normalizedEmail: string | null
  emailDomain: string | null
  emailVerified: boolean | null
  hostedDomain: string | null
}

interface DomainAccessInput {
  allowedEmailDomain?: string | null
  account?: Pick<Account, 'provider'> | null
  profile?: Pick<Profile, 'email' | 'email_verified'> & { hd?: unknown }
  userEmail?: string | null
}

interface InstanceMembershipLike {
  role: 'owner' | 'admin' | 'member'
  is_active: boolean
  deactivated_at: string | null
}

interface SignInInput extends DomainAccessInput {
  userId?: string | null
}

interface SignInDependencies {
  ensureMembership: (userId: string) => Promise<InstanceMembershipLike>
  upsertUserStats: (userId: string) => Promise<void>
}

const ERROR_REDIRECTS = {
  membershipInactive: '/?error=MembershipInactive',
} as const

function buildDetailedAccessDeniedRedirect(decision: DomainAccessDecision): string {
  const params = new URLSearchParams({ error: 'AccessDenied' })
  if (decision.reason) params.set('reason', decision.reason)
  if (decision.provider) params.set('provider', decision.provider)
  if (decision.emailDomain) params.set('email_domain', decision.emailDomain)
  if (decision.hostedDomain) params.set('hosted_domain', decision.hostedDomain)
  if (decision.emailVerified != null) {
    params.set('email_verified', decision.emailVerified ? 'true' : 'false')
  }
  return `/?${params.toString()}`
}

export function normalizeAllowedEmailDomain(value?: string | null): string | null {
  return normalizeAllowedEmailDomains(value)[0] ?? null
}

export function normalizeAllowedEmailDomains(value?: string | null): string[] {
  if (typeof value !== 'string') return []

  return value
    .split(/[,\n]/)
    .map((part) => part.trim().toLowerCase().replace(/^@+/, ''))
    .filter((part) => part.length > 0)
}

function normalizeEmail(value?: string | null): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function getEmailDomain(email: string | null): string | null {
  if (!email) return null

  const [, domain] = email.split('@')
  return domain ?? null
}

function isDomainAllowed(domain: string | null, allowedDomains: string[]): boolean {
  if (!domain) return false

  return allowedDomains.some(
    (allowedDomain) => domain === allowedDomain || domain.endsWith(`.${allowedDomain}`),
  )
}

function matchesAllowedDomain(email: string | null, allowedDomains: string[]): boolean {
  return isDomainAllowed(getEmailDomain(email), allowedDomains)
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return null

  return `${localPart.slice(0, 2)}***@${domain}`
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

export function evaluateDomainAccess({
  allowedEmailDomain,
  account,
  profile,
  userEmail,
}: DomainAccessInput): DomainAccessDecision {
  const allowedDomains = normalizeAllowedEmailDomains(allowedEmailDomain)
  const allowedDomain = allowedDomains[0] ?? null
  const provider = account?.provider ?? null
  const normalizedEmail = normalizeEmail(profile?.email ?? userEmail ?? null)
  const emailDomain = getEmailDomain(normalizedEmail)
  const hostedDomain = normalizeAllowedEmailDomain(
    typeof profile?.hd === 'string' ? profile.hd : null,
  )
  const emailVerified =
    typeof profile?.email_verified === 'boolean' ? profile.email_verified : null

  if (!allowedDomain) {
    return {
      allowed: true,
      reason: null,
      allowedDomain: null,
      allowedDomains: [],
      provider,
      normalizedEmail,
      emailDomain,
      emailVerified,
      hostedDomain,
    }
  }

  if (provider === 'google') {
    if (emailVerified === false) {
      return {
        allowed: false,
        reason: 'unverified_google_email',
        allowedDomain,
        allowedDomains,
        provider,
        normalizedEmail,
        emailDomain,
        emailVerified,
        hostedDomain,
      }
    }

    if (
      matchesAllowedDomain(normalizedEmail, allowedDomains) ||
      isDomainAllowed(hostedDomain, allowedDomains)
    ) {
      return {
        allowed: true,
        reason: null,
        allowedDomain,
        allowedDomains,
        provider,
        normalizedEmail,
        emailDomain,
        emailVerified,
        hostedDomain,
      }
    }

    return {
      allowed: false,
      reason:
        normalizedEmail || hostedDomain
          ? hostedDomain && !isDomainAllowed(hostedDomain, allowedDomains)
            ? 'hosted_domain_mismatch'
            : 'email_domain_mismatch'
          : 'missing_email',
      allowedDomain,
      allowedDomains,
      provider,
      normalizedEmail,
      emailDomain,
      emailVerified,
      hostedDomain,
    }
  }

  if (matchesAllowedDomain(normalizedEmail, allowedDomains)) {
    return {
      allowed: true,
      reason: null,
      allowedDomain,
      allowedDomains,
      provider,
      normalizedEmail,
      emailDomain,
      emailVerified,
      hostedDomain,
    }
  }

  return {
    allowed: false,
    reason: normalizedEmail ? 'email_domain_mismatch' : 'missing_email',
    allowedDomain,
    allowedDomains,
    provider,
    normalizedEmail,
    emailDomain,
    emailVerified,
    hostedDomain,
  }
}

export function getAccessDeniedMessage(
  allowedEmailDomain?: string | null,
  reason?: DomainRestrictionReason | null,
  detail?: {
    provider?: string | null
    emailDomain?: string | null
    hostedDomain?: string | null
    emailVerified?: string | null
  },
): string {
  const allowedDomains = normalizeAllowedEmailDomains(allowedEmailDomain)
  const allowedDomain = allowedDomains[0] ?? null
  const detailSuffix =
    detail?.emailDomain || detail?.hostedDomain
      ? ` Returned identity: email domain ${detail.emailDomain ?? 'unknown'}${
          detail?.hostedDomain ? `, workspace ${detail.hostedDomain}` : ''
        }.`
      : ''
  if (reason === 'missing_email') {
    return `Access denied. Your sign-in provider did not return an email address. Try your company Google account.${detailSuffix}`
  }
  if (reason === 'unverified_google_email') {
    return `Access denied. Google reported this email as unverified. Try your verified company Google account.${detailSuffix}`
  }
  if (reason === 'hosted_domain_mismatch') {
    return `Access denied. Google says this account belongs to a different workspace. If you have multiple accounts, switch to your company one.${detailSuffix}`
  }
  if (reason === 'email_domain_mismatch') {
    if (!allowedDomain) return `Access denied. This account does not match the allowed sign-in domain.${detailSuffix}`
    if (allowedDomains.length > 1) {
      return `Access denied. This account does not match the approved company domains. If you have multiple accounts, switch to the right one.${detailSuffix}`
    }
    return `Access denied. This account is not in @${allowedDomain}. If you have multiple Google accounts, switch to your @${allowedDomain} one.${detailSuffix}`
  }
  if (!allowedDomain) return 'Access denied. Please try again or contact your admin.'
  if (allowedDomains.length > 1) return 'Access denied. Only approved company accounts can sign in.'
  return `Access denied. Only @${allowedDomain} accounts can sign in.`
}

export async function authorizeSignIn(
  input: SignInInput,
  dependencies: SignInDependencies,
): Promise<true | string> {
  const accessDecision = evaluateDomainAccess(input)

  if (!accessDecision.allowed) {
    console.warn('[auth][domain-restriction]', {
      provider: accessDecision.provider,
      allowedDomain: accessDecision.allowedDomain,
      allowedDomains: accessDecision.allowedDomains,
      email: maskEmail(accessDecision.normalizedEmail),
      hasEmail: Boolean(accessDecision.normalizedEmail),
      emailVerified: accessDecision.emailVerified,
      hasHostedDomain: Boolean(accessDecision.hostedDomain),
      hostedDomain: accessDecision.hostedDomain,
      reason: accessDecision.reason,
    })
    return buildDetailedAccessDeniedRedirect(accessDecision)
  }

  if (!input.userId) return true

  let membership: InstanceMembershipLike
  try {
    membership = await dependencies.ensureMembership(input.userId)
  } catch (error) {
    console.error('[auth][membership-bootstrap-failed]', {
      provider: accessDecision.provider,
      userId: input.userId,
      error: getErrorMessage(error),
    })
    return true
  }

  if (!membership.is_active) {
    console.warn('[auth][membership-inactive]', {
      provider: accessDecision.provider,
      userId: input.userId,
      role: membership.role,
      deactivatedAt: membership.deactivated_at,
    })
    return ERROR_REDIRECTS.membershipInactive
  }

  try {
    await dependencies.upsertUserStats(input.userId)
  } catch (error) {
    console.error('[auth][user-stats-bootstrap-failed]', {
      provider: accessDecision.provider,
      userId: input.userId,
      error: getErrorMessage(error),
    })
  }

  return true
}
