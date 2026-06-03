import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('homepage no longer fetches or renders insights inline', () => {
  const homePage = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
  const leaderboardClient = readFileSync(new URL('../components/LeaderboardClient.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(homePage, /getTeamInsights/)
  assert.doesNotMatch(leaderboardClient, /TeamInsightsSection/)
  assert.doesNotMatch(leaderboardClient, /\/api\/insights\?period=/)
})

test('insights page exists with instance-wide explanatory copy and shared navigation', () => {
  const insightsPage = readFileSync(new URL('../app/insights/page.tsx', import.meta.url), 'utf8')
  const header = readFileSync(new URL('../components/AppPrimaryNav.tsx', import.meta.url), 'utf8')
  const insightsClient = readFileSync(new URL('../components/InsightsClient.tsx', import.meta.url), 'utf8')

  assert.match(insightsPage, /InsightsClient/)
  assert.match(insightsClient, /Instance Analytics/)
  assert.match(insightsClient, /everyone active in this leaderboard instance/i)
  assert.match(header, /href: '\/insights'/)
  assert.match(header, /Leaderboard/)
  assert.match(header, /Insights/)
})
