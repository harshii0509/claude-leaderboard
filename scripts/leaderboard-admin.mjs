#!/usr/bin/env node

const [, , command, ...flags] = process.argv
const jsonOutput = flags.includes('--json')

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!command || !['rebuild', 'reset', 'rescan', 'status'].includes(command)) {
  console.error('Usage: node scripts/leaderboard-admin.mjs <rebuild|reset|rescan|status> [--json]')
  process.exit(1)
}

function printStatus(status) {
  const pendingUsers = Array.isArray(status?.needs_sync) ? status.needs_sync : []
  const totalUsers = Number.isFinite(status?.total_users) ? status.total_users : 0
  const syncedUsers = Number.isFinite(status?.users_with_raw_events) ? status.users_with_raw_events : 0
  const pendingCount = Number.isFinite(status?.users_without_raw_events) ? status.users_without_raw_events : pendingUsers.length
  const generation = Number.isFinite(status?.sync_generation) ? status.sync_generation : 1
  const completion = totalUsers > 0 ? Math.round((syncedUsers / totalUsers) * 100) : 0

  console.log(`Sync generation: ${generation}`)
  console.log(`Users refilled: ${syncedUsers}/${totalUsers} (${completion}%)`)
  console.log(`Still need sync: ${pendingCount}`)

  if (pendingUsers.length === 0) {
    console.log('\nEveryone has repopulated raw history for the current generation.')
    return
  }

  console.log('\nPending users:')
  for (const user of pendingUsers) {
    const name = user?.name ?? 'Unknown user'
    const email = user?.email ? ` <${user.email}>` : ''
    const lastSync = user?.last_synced_at ?? 'never'
    const lastActivity = user?.last_activity_date ?? 'none'
    console.log(`- ${name}${email} | last sync: ${lastSync} | last activity: ${lastActivity}`)
  }
}

async function callRpc(name) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    console.error(`RPC ${name} failed:`, payload)
    process.exit(1)
  }

  if (name === 'get_leaderboard_sync_status' && !jsonOutput) {
    printStatus(payload)
    return
  }

  console.log(JSON.stringify(payload, null, 2))
}

if (command === 'rebuild') {
  await callRpc('refresh_all_leaderboard_rollups')
}

if (command === 'reset') {
  await callRpc('reset_leaderboard_data')
}

if (command === 'rescan') {
  await callRpc('bump_sync_generation')
}

if (command === 'status') {
  await callRpc('get_leaderboard_sync_status')
}
