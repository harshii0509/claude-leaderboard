const MISSING_WIDGET_SETTINGS_HINTS = [
  'schema cache',
  'does not exist',
  '42p01',
  'could not find the table',
] as const

export function isMissingUserWidgetSettingsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase()
  return (
    message.includes('user_widget_settings') &&
    MISSING_WIDGET_SETTINGS_HINTS.some((hint) => message.includes(hint))
  )
}

export function getUserWidgetSettingsUnavailableMessage() {
  return 'Widget publishing is temporarily unavailable until the user_widget_settings migration is applied.'
}
