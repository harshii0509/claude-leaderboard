import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateDomainAccess,
  getAccessDeniedMessage,
  normalizeAllowedEmailDomain,
  normalizeAllowedEmailDomains,
} from '../lib/auth-domain.ts'

test('evaluateDomainAccess allows a verified Google user with a matching email domain', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@juspay.in',
      email_verified: true,
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
})

test('evaluateDomainAccess allows a verified Google user when hosted domain matches', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@contractor.example',
      email_verified: true,
      hd: 'juspay.in',
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
})

test('evaluateDomainAccess denies unverified Google emails before domain checks', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@juspay.in',
      email_verified: false,
    },
  })

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'unverified_google_email')
})

test('evaluateDomainAccess allows Google users when verification field is missing but domain matches', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@juspay.in',
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
  assert.equal(result.emailVerified, null)
})

test('evaluateDomainAccess denies Google users outside the allowed domain', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@gmail.com',
      email_verified: true,
    },
  })

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'email_domain_mismatch')
})

test('evaluateDomainAccess normalizes mixed-case domains and surrounding whitespace', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: '  JusPay.In ',
    account: { provider: 'google' },
    profile: {
      email: 'Person@JUSPAY.IN',
      email_verified: true,
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.allowedDomain, 'juspay.in')
  assert.deepEqual(result.allowedDomains, ['juspay.in'])
  assert.equal(result.normalizedEmail, 'person@juspay.in')
})

test('evaluateDomainAccess accepts leading @ and comma-separated domains', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: ' @juspay.in, workspace.juspay.in ',
    account: { provider: 'google' },
    profile: {
      email: 'person@workspace.juspay.in',
      email_verified: true,
    },
  })

  assert.equal(result.allowed, true)
  assert.deepEqual(result.allowedDomains, ['juspay.in', 'workspace.juspay.in'])
})

test('evaluateDomainAccess allows Google users on workspace subdomains of the allowed root domain', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@eng.juspay.in',
      email_verified: true,
      hd: 'eng.juspay.in',
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
})

test('evaluateDomainAccess keeps sign-in open when no allowed domain is configured', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: undefined,
    account: { provider: 'google' },
    profile: {
      email: 'person@gmail.com',
      email_verified: false,
    },
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
})

test('evaluateDomainAccess falls back to email-domain matching for non-Google providers', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'github' },
    userEmail: 'dev@workspace.juspay.in',
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, null)
})

test('evaluateDomainAccess reports hosted domain mismatches for Google workspace users', () => {
  const result = evaluateDomainAccess({
    allowedEmailDomain: 'juspay.in',
    account: { provider: 'google' },
    profile: {
      email: 'person@external.example',
      email_verified: true,
      hd: 'external.example',
    },
  })

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'hosted_domain_mismatch')
})

test('getAccessDeniedMessage reflects the configured domain', () => {
  assert.equal(
    getAccessDeniedMessage(' JusPay.In '),
    'Access denied. Only @juspay.in accounts can sign in.',
  )
  assert.equal(
    getAccessDeniedMessage(undefined),
    'Access denied. Please try again or contact your admin.',
  )
  assert.equal(normalizeAllowedEmailDomain('  JUSPAY.IN  '), 'juspay.in')
  assert.deepEqual(normalizeAllowedEmailDomains(' @JUSPAY.IN, workspace.juspay.in '), [
    'juspay.in',
    'workspace.juspay.in',
  ])
  assert.equal(
    getAccessDeniedMessage('juspay.in, workspace.juspay.in'),
    'Access denied. Only approved company accounts can sign in.',
  )
})
