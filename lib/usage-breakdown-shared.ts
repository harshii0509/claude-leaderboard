export interface UsageBreakdownModel {
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  total_tokens: number
  sessions: number
  events: number
}

export interface UsageBreakdownProvider {
  provider: string
  total_tokens: number
  models: UsageBreakdownModel[]
}

export interface UsageBreakdownSource {
  source: string
  total_tokens: number
  total_sessions: number
  total_events: number
  providers: UsageBreakdownProvider[]
}

export interface UsageBreakdown {
  sources: UsageBreakdownSource[]
}

export interface UsageBreakdownRow {
  source: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  cache_creation_input_tokens: number | null
  cache_read_input_tokens: number | null
  sessions: number | null
  events: number | null
  source_total_sessions: number | null
  source_total_events: number | null
}

export const SOURCE_ORDER: Record<string, number> = {
  claude: 1,
  codex: 2,
  opencode: 3,
}

const SOURCE_PROVIDER_DEFAULTS: Record<string, string> = {
  claude: 'anthropic',
  codex: 'openai',
}

export function deriveUsageProvider(source: string, model: string) {
  const normalizedModel = model.trim()
  if (normalizedModel.includes('/')) {
    const [provider] = normalizedModel.split('/', 1)
    if (provider) return provider
  }

  return SOURCE_PROVIDER_DEFAULTS[source] ?? 'unknown'
}

export function getUsageModelLabel(model: string) {
  const bareModel = model.includes('/') ? model.split('/').slice(1).join('/') : model
  return bareModel.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

export function getUsageSourceLabel(source: string) {
  switch (source) {
    case 'claude':
      return 'Claude'
    case 'codex':
      return 'Codex'
    case 'opencode':
      return 'OpenCode'
    default:
      return source
  }
}

export function getUsageProviderLabel(provider: string) {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic'
    case 'openai':
      return 'OpenAI'
    case 'unknown':
      return 'Unknown'
    default:
      return provider
  }
}
