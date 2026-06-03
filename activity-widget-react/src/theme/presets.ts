import type { ActivityWidgetPreset, ActivityWidgetTheme } from '../types.js'

const PRESET_THEMES: Record<ActivityWidgetPreset, ActivityWidgetTheme> = {
  arcade: {
    frame: '#f1f5fa',
    text: '#212121',
    muted: '#5a6480',
    chipBackground: 'rgba(255,255,255,0.72)',
    chipBorder: 'rgba(34,38,53,0.08)',
    tooltipBackground: '#111827',
    tooltipText: '#f8fafc',
    avatarBackground: '#e2e8f0',
    activityScale: ['#deeaf5', 'rgba(166,211,69,0.2)', 'rgba(166,211,69,0.4)', 'rgba(166,211,69,0.7)', '#a6d345'],
  },
  night: {
    frame: '#020617',
    text: '#f8fafc',
    muted: '#cbd5e1',
    chipBackground: 'rgba(15,23,42,0.86)',
    chipBorder: 'rgba(103,232,249,0.24)',
    tooltipBackground: '#f8fafc',
    tooltipText: '#020617',
    avatarBackground: '#0f172a',
    activityScale: ['rgba(30,41,59,0.88)', 'rgba(34,211,238,0.18)', 'rgba(34,211,238,0.35)', 'rgba(34,211,238,0.68)', '#a5f3fc'],
  },
  paper: {
    frame: '#fffbeb',
    text: '#292524',
    muted: '#78716c',
    chipBackground: 'rgba(255,255,255,0.75)',
    chipBorder: 'rgba(120,53,15,0.10)',
    tooltipBackground: '#292524',
    tooltipText: '#fffbeb',
    avatarBackground: '#f5f5f4',
    activityScale: ['#e7e5e4', 'rgba(217,119,6,0.18)', 'rgba(217,119,6,0.34)', 'rgba(180,83,9,0.68)', '#92400e'],
  },
}

export function getPresetTheme(preset: ActivityWidgetPreset): ActivityWidgetTheme {
  return PRESET_THEMES[preset]
}
