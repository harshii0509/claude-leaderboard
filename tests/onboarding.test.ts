import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getHomeRedirectPath,
  getJoinFlowRedirectPath,
  hasCompletedOnboarding,
} from '../lib/onboarding.ts'
import {
  buildJoinUrl,
  getDisplayUrl,
  isLikelyMobileUserAgent,
} from '../lib/request-context.ts'

test('hasCompletedOnboarding treats users without sync activity as incomplete', () => {
  assert.equal(hasCompletedOnboarding(null), false)
  assert.equal(
    hasCompletedOnboarding({
      last_synced_at: null,
      total_sessions: 0,
    }),
    false,
  )
})

test('hasCompletedOnboarding treats synced users as complete', () => {
  assert.equal(
    hasCompletedOnboarding({
      last_synced_at: '2026-06-03T10:00:00.000Z',
      total_sessions: 0,
    }),
    true,
  )
  assert.equal(
    hasCompletedOnboarding({
      last_synced_at: null,
      total_sessions: 2,
    }),
    true,
  )
})

test('join flow redirects first-time users to welcome and returning users home', () => {
  assert.equal(getJoinFlowRedirectPath(true), '/welcome')
  assert.equal(getJoinFlowRedirectPath(false), '/')
})

test('home redirect sends desktop-first users to setup but leaves mobile alone', () => {
  assert.equal(getHomeRedirectPath({ onboardingEligible: true, isMobile: false }), '/setup')
  assert.equal(getHomeRedirectPath({ onboardingEligible: true, isMobile: true }), null)
  assert.equal(getHomeRedirectPath({ onboardingEligible: false, isMobile: false }), null)
})

test('request helpers build and display the join URL consistently', () => {
  const joinUrl = buildJoinUrl('https://leaderboard.example.com/app')

  assert.equal(joinUrl, 'https://leaderboard.example.com/join')
  assert.equal(getDisplayUrl(joinUrl), 'leaderboard.example.com/join')
})

test('mobile user agent detection catches phones and ignores desktops', () => {
  assert.equal(
    isLikelyMobileUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    ),
    true,
  )
  assert.equal(
    isLikelyMobileUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/125.0 Safari/537.36',
    ),
    false,
  )
})
