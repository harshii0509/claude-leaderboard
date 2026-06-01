#!/usr/bin/env node

const [, , command] = process.argv

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!command || !['rebuild', 'reset', 'rescan', 'status'].includes(command)) {
  console.error('Usage: node scripts/leaderboard-admin.mjs <rebuild|reset|rescan|status>')
  process.exit(1)
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
