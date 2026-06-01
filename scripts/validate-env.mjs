#!/usr/bin/env node

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AUTH_SECRET',
  'NEXT_PUBLIC_APP_URL',
]

const optional = ['ALLOWED_EMAIL_DOMAIN']

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl && !isPlaceholder(appUrl)) {
  if (!isValidUrl(appUrl)) {
    missing.push('NEXT_PUBLIC_APP_URL (must be a valid http/https URL)')
  } else if (appUrl.endsWith('/')) {
    warnings.push('NEXT_PUBLIC_APP_URL should not include a trailing slash.')
  }
}

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN
if (allowedDomain && (allowedDomain.includes('@') || allowedDomain.includes(' '))) {
  warnings.push('ALLOWED_EMAIL_DOMAIN should be a bare domain like company.com, not an email address.')
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
