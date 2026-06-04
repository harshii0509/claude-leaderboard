import { QueryClient } from '@tanstack/react-query'

export const clientQueryKeys = {
  leaderboard: (sort: string, period: string) => ['leaderboard', sort, period] as const,
  userProfile: (userId: string) => ['user-profile', userId] as const,
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    },
  })
}

export async function fetchApiJson<T>(
  input: string,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : fallbackMessage
    throw new Error(message)
  }

  if (payload === null) {
    throw new Error(`${fallbackMessage} response was empty.`)
  }

  return payload as T
}
