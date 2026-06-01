import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { Provider } from 'next-auth/providers'

export interface AuthProviderOption {
  id: 'google' | 'github'
  label: string
}

const GOOGLE_OPTION: AuthProviderOption = {
  id: 'google',
  label: 'Google',
}

const GITHUB_OPTION: AuthProviderOption = {
  id: 'github',
  label: 'GitHub',
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function getEnabledAuthProviderOptions(): AuthProviderOption[] {
  const options: AuthProviderOption[] = []

  if (hasValue(process.env.GOOGLE_CLIENT_ID) && hasValue(process.env.GOOGLE_CLIENT_SECRET)) {
    options.push(GOOGLE_OPTION)
  }

  if (hasValue(process.env.GITHUB_CLIENT_ID) && hasValue(process.env.GITHUB_CLIENT_SECRET)) {
    options.push(GITHUB_OPTION)
  }

  return options
}

export function getEnabledAuthProviders(): Provider[] {
  const providers: Provider[] = []

  if (hasValue(process.env.GOOGLE_CLIENT_ID) && hasValue(process.env.GOOGLE_CLIENT_SECRET)) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    )
  }

  if (hasValue(process.env.GITHUB_CLIENT_ID) && hasValue(process.env.GITHUB_CLIENT_SECRET)) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
    )
  }

  return providers
}
