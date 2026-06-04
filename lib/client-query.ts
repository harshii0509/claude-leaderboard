import { QueryClient } from '@tanstack/react-query'
import { parseApiJsonResponse } from './api-json-response.ts'

export const clientQueryKeys = {
  leaderboard: (sort: string, period: string) => ['leaderboard', sort, period] as const,
  userProfile: (userId: string) => ['user-profile', userId] as const,
  widgetSettings: () => ['widget-settings'] as const,
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
  const { data, error } = await parseApiJsonResponse<T>(response, fallbackMessage)

  if (error) {
    throw new Error(error)
  }

  if (data === null) {
    throw new Error(`${fallbackMessage} response was empty.`)
  }

  return data
}
