#!/usr/bin/env node

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUTH_SECRET',
  'NEXT_PUBLIC_APP_URL',
]

const optional = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'ALLOWED_EMAIL_DOMAIN',
]

function isPlaceholder(value) {
  if (!value) return true

  const normalized = value.trim().toLowerCase()
  return (
    normalized.includes('your-') ||
    normalized === 'changeme' ||
    normalized === 'replace-me'
  )
}

function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const missing = []
const warnings = []

for (const key of required) {
  const value = process.env[key]
  if (!value || isPlaceholder(value)) {
    missing.push(key)
  }
}

const hasGoogle =
  Boolean(process.env.GOOGLE_CLIENT_ID && !isPlaceholder(process.env.GOOGLE_CLIENT_ID)) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET && !isPlaceholder(process.env.GOOGLE_CLIENT_SECRET))

const hasGitHub =
  Boolean(process.env.GITHUB_CLIENT_ID && !isPlaceholder(process.env.GITHUB_CLIENT_ID)) &&
  Boolean(process.env.GITHUB_CLIENT_SECRET && !isPlaceholder(process.env.GITHUB_CLIENT_SECRET))

if (!hasGoogle && !hasGitHub) {
  missing.push('At least one auth provider: configure Google or GitHub OAuth credentials')
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl && !isPlaceholder(appUrl)) {
  if (!isValidUrl(appUrl)) {
    missing.push('NEXT_PUBLIC_APP_URL (must be a valid http/https URL)')
  } else if (appUrl.endsWith('/')) {
    warnings.push('NEXT_PUBLIC_APP_URL should not include a trailing slash.')
  }
}

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
if (allowedDomain) {
  const normalizedParts = allowedDomain
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (normalizedParts.some((part) => /^[^@\s]+@[^@\s]+$/.test(part))) {
    warnings.push(
      'ALLOWED_EMAIL_DOMAIN should contain domains like company.com, optionally comma-separated, not full email addresses.',
    )
  }
}

for (const key of optional) {
  if (process.env[key] && isPlaceholder(process.env[key])) {
    warnings.push(`${key} is still using a placeholder value.`)
  }
}

if (warnings.length > 0) {
  console.log('Environment warnings:')
  for (const warning of warnings) {
    console.log(`- ${warning}`)
  }
  console.log('')
}

if (missing.length > 0) {
  console.error('Environment validation failed. Missing or placeholder values:')
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  process.exit(1)
}

console.log('Environment variables look ready for a self-hosted deployment.')
