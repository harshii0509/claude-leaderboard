import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getUserWidgetSettingsUnavailableMessage,
  isMissingUserWidgetSettingsError,
} from '../lib/user-widget-errors.ts'

test('detects postgres missing table errors for widget settings', () => {
  assert.equal(
    isMissingUserWidgetSettingsError(
      new Error('widget settings lookup failed: relation "public.user_widget_settings" does not exist (SQLSTATE 42P01)'),
    ),
    true,
  )
})

test('detects supabase schema cache errors for widget settings', () => {
  assert.equal(
    isMissingUserWidgetSettingsError(
      new Error("widget settings lookup failed: Could not find the table 'public.user_widget_settings' in the schema cache"),
    ),
    true,
  )
})

test('ignores unrelated widget errors', () => {
  assert.equal(
    isMissingUserWidgetSettingsError(
      new Error('widget settings lookup failed: permission denied for table user_widget_settings'),
    ),
    false,
  )
})

test('returns a stable operator-facing unavailable message', () => {
  assert.match(getUserWidgetSettingsUnavailableMessage(), /temporarily unavailable/i)
  assert.match(getUserWidgetSettingsUnavailableMessage(), /migration/i)
})
