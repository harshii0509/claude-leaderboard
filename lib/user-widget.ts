import { randomUUID } from 'node:crypto'
import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from './db'
import { computeStreaks } from './leaderboard-math'
import { getInstanceMembership } from './instance-membership'
import {
  DEFAULT_WIDGET_PRESET,
  isWidgetPreset,
  PUBLIC_WIDGET_ACTIVITY_DAYS,
  type PublicActivityWidgetData,
  type UserWidgetSettings,
  type WidgetActivityDay,
  type WidgetPreset,
} from './widget-types'

interface UserWidgetSettingsRow {
  user_id: string
  public_id: string
  is_published: boolean | null
  preset: string | null
}

interface UserStatRow {
  last_synced_at: string | null
}

interface PublicUserRow {
  id: string
  name: string | null
  image: string | null
}

function normalizePreset(preset: string | null | undefined): WidgetPreset {
  return preset && isWidgetPreset(preset) ? preset : DEFAULT_WIDGET_PRESET
}

function createPublicId() {
  return randomUUID().replace(/-/g, '').slice(0, 16)
}

function normalizeSettingsRow(row: UserWidgetSettingsRow): UserWidgetSettings {
  return {
    user_id: row.user_id,
    public_id: row.public_id,
    is_published: row.is_published === true,
    preset: normalizePreset(row.preset),
  }
}

async function insertDefaultSettings(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_widget_settings')
    .insert({
      user_id: userId,
      public_id: createPublicId(),
      is_published: false,
      preset: DEFAULT_WIDGET_PRESET,
    })
    .select('user_id,public_id,is_published,preset')
    .single<UserWidgetSettingsRow>()

  if (error) throw new Error(`widget settings bootstrap failed: ${error.message}`)
  return normalizeSettingsRow(data)
}

export async function getOrCreateUserWidgetSettings(userId: string): Promise<UserWidgetSettings> {
  const { data, error } = await supabaseAdmin
    .from('user_widget_settings')
    .select('user_id,public_id,is_published,preset')
    .eq('user_id', userId)
    .maybeSingle<UserWidgetSettingsRow>()

  if (error) throw new Error(`widget settings lookup failed: ${error.message}`)
  if (data) return normalizeSettingsRow(data)

  try {
    return await insertDefaultSettings(userId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'widget settings bootstrap failed'
    if (!message.includes('duplicate')) throw error

    const retry = await supabaseAdmin
      .from('user_widget_settings')
      .select('user_id,public_id,is_published,preset')
      .eq('user_id', userId)
      .single<UserWidgetSettingsRow>()

    if (retry.error) throw new Error(`widget settings lookup failed: ${retry.error.message}`)
    return normalizeSettingsRow(retry.data)
  }
}

export async function updateUserWidgetSettings(
  userId: string,
  input: { is_published?: boolean; preset?: WidgetPreset; regeneratePublicId?: boolean },
): Promise<UserWidgetSettings> {
  const current = await getOrCreateUserWidgetSettings(userId)
  const updatePayload = {
    is_published: input.is_published ?? current.is_published,
    preset: input.preset ?? current.preset,
    public_id: input.regeneratePublicId ? createPublicId() : current.public_id,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('user_widget_settings')
    .update(updatePayload)
    .eq('user_id', userId)
    .select('user_id,public_id,is_published,preset')
    .single<UserWidgetSettingsRow>()

  if (error) throw new Error(`widget settings update failed: ${error.message}`)
  return normalizeSettingsRow(data)
}

export async function getPublishedWidgetPublicId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user_widget_settings')
    .select('public_id,is_published')
    .eq('user_id', userId)
    .maybeSingle<{ public_id: string; is_published: boolean | null }>()

  if (error) throw new Error(`widget public id lookup failed: ${error.message}`)
  if (!data?.is_published) return null
  return data.public_id
}

async function queryPublicActivityWidgetData(publicId: string): Promise<PublicActivityWidgetData | null> {
  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from('user_widget_settings')
    .select('user_id,public_id,is_published,preset')
    .eq('public_id', publicId)
    .eq('is_published', true)
    .maybeSingle<UserWidgetSettingsRow>()

  if (settingsError) throw new Error(`public widget lookup failed: ${settingsError.message}`)
  if (!settingsRow) return null

  const membership = await getInstanceMembership(settingsRow.user_id)
  if (!membership?.is_active) return null

  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (PUBLIC_WIDGET_ACTIVITY_DAYS - 1))
  const sinceStr = since.toISOString().slice(0, 10)

  const [{ data: publicUsers, error: usersError }, { data: stats, error: statsError }, { data: activity, error: activityError }] = await Promise.all([
    supabaseAdmin.rpc('get_public_users', { p_user_ids: [settingsRow.user_id] }),
    supabaseAdmin
      .from('user_stats')
      .select('last_synced_at')
      .eq('user_id', settingsRow.user_id)
      .maybeSingle<UserStatRow>(),
    supabaseAdmin
      .from('daily_activity')
      .select('date,input_tokens,output_tokens,cache_creation_input_tokens,cache_read_input_tokens,messages,sessions')
      .eq('user_id', settingsRow.user_id)
      .gte('date', sinceStr)
      .order('date', { ascending: true })
      .returns<WidgetActivityDay[]>(),
  ])

  if (usersError) throw new Error(`public widget user lookup failed: ${usersError.message}`)
  if (statsError) throw new Error(`public widget stats lookup failed: ${statsError.message}`)
  if (activityError) throw new Error(`public widget activity lookup failed: ${activityError.message}`)

  const publicUser = Array.isArray(publicUsers) ? (publicUsers[0] as PublicUserRow | undefined) : undefined
  if (!publicUser) return null

  const typedActivity = activity ?? []
  const streaks = computeStreaks(typedActivity.map((row) => row.date))

  return {
    publicId: settingsRow.public_id,
    displayName: publicUser.name ?? 'Anonymous',
    image: publicUser.image ?? null,
    preset: normalizePreset(settingsRow.preset),
    currentStreak: streaks.current,
    totalActiveDays: typedActivity.length,
    lastSyncedAt: stats?.last_synced_at ?? null,
    activity: typedActivity,
  }
}

export async function getPublicActivityWidgetData(publicId: string) {
  return unstable_cache(
    async () => queryPublicActivityWidgetData(publicId),
    ['public-widget', publicId],
    { revalidate: 300, tags: [`public-widget:${publicId}`] },
  )()
}
