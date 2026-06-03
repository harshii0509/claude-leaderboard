import { getPresetTheme } from './presets.js'
import type { ActivityWidgetPreset, ActivityWidgetTheme } from '../types.js'

export function mergeWidgetTheme(
  preset: ActivityWidgetPreset,
  override?: Partial<ActivityWidgetTheme>,
): ActivityWidgetTheme {
  const baseTheme = getPresetTheme(preset)

  if (!override) {
    return baseTheme
  }

  return {
    ...baseTheme,
    ...override,
    activityScale: override.activityScale ?? baseTheme.activityScale,
  }
}
