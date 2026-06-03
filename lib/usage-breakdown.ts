import { supabaseAdmin } from './db.ts'
import {
  deriveUsageProvider,
  SOURCE_ORDER,
  type UsageBreakdown,
  type UsageBreakdownModel,
  type UsageBreakdownRow,
  type UsageBreakdownSource,
} from './usage-breakdown-shared.ts'

export {
  deriveUsageProvider,
  getUsageModelLabel,
  getUsageProviderLabel,
  getUsageSourceLabel,
  type UsageBreakdown,
  type UsageBreakdownModel,
  type UsageBreakdownProvider,
  type UsageBreakdownRow,
  type UsageBreakdownSource,
} from './usage-breakdown-shared.ts'

function totalTokens(parts: {
  input_tokens: number | null
  output_tokens: number | null
  cache_creation_input_tokens: number | null
  cache_read_input_tokens: number | null
}) {
  return (
    (parts.input_tokens ?? 0) +
    (parts.output_tokens ?? 0) +
    (parts.cache_creation_input_tokens ?? 0) +
    (parts.cache_read_input_tokens ?? 0)
  )
}

export function buildUsageBreakdown(rows: UsageBreakdownRow[] | null | undefined): UsageBreakdown {
  const sources = new Map<string, UsageBreakdownSource>()

  for (const row of rows ?? []) {
    const sourceKey = row.source
    const providerKey = deriveUsageProvider(sourceKey, row.model)
    const source = sources.get(sourceKey) ?? {
      source: sourceKey,
      total_tokens: 0,
      total_sessions: row.source_total_sessions ?? 0,
      total_events: row.source_total_events ?? 0,
      providers: [],
    }

    let provider = source.providers.find((entry) => entry.provider === providerKey)
    if (!provider) {
      provider = {
        provider: providerKey,
        total_tokens: 0,
        models: [],
      }
      source.providers.push(provider)
    }

    const modelEntry: UsageBreakdownModel = {
      model: row.model,
      input_tokens: row.input_tokens ?? 0,
      output_tokens: row.output_tokens ?? 0,
      cache_creation_input_tokens: row.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: row.cache_read_input_tokens ?? 0,
      total_tokens: totalTokens(row),
      sessions: row.sessions ?? 0,
      events: row.events ?? 0,
    }

    provider.models.push(modelEntry)
    provider.total_tokens += modelEntry.total_tokens
    source.total_tokens += modelEntry.total_tokens
    sources.set(sourceKey, source)
  }

  const orderedSources = [...sources.values()]
    .sort((a, b) => {
      const aOrder = SOURCE_ORDER[a.source] ?? 99
      const bOrder = SOURCE_ORDER[b.source] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      return b.total_tokens - a.total_tokens
    })
    .map((source) => ({
      ...source,
      providers: source.providers
        .map((provider) => ({
          ...provider,
          models: provider.models.sort((a, b) => {
            if (b.total_tokens !== a.total_tokens) return b.total_tokens - a.total_tokens
            return a.model.localeCompare(b.model)
          }),
        }))
        .sort((a, b) => {
          if (b.total_tokens !== a.total_tokens) return b.total_tokens - a.total_tokens
          return a.provider.localeCompare(b.provider)
        }),
    }))

  return { sources: orderedSources }
}

export async function getUserUsageBreakdown(userId: string): Promise<UsageBreakdown> {
  const { data, error } = await supabaseAdmin.rpc('get_user_usage_breakdown', {
    p_user_id: userId,
  })

  if (error) throw new Error(error.message)

  return buildUsageBreakdown((data ?? []) as UsageBreakdownRow[])
}
