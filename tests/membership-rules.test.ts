import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessAdmin,
  canSelfDelete,
  canUseSyncFeatures,
  evaluateMembershipAction,
  getInitialMembershipRole,
} from '../lib/membership-rules.ts'

test('getInitialMembershipRole makes the first user the owner and later users members', () => {
  assert.equal(getInitialMembershipRole(0), 'owner')
  assert.equal(getInitialMembershipRole(1), 'member')
  assert.equal(getInitialMembershipRole(12), 'member')
})

test('canAccessAdmin only allows active owners and admins', () => {
  assert.equal(canAccessAdmin('owner', true), true)
  assert.equal(canAccessAdmin('admin', true), true)
  assert.equal(canAccessAdmin('member', true), false)
  assert.equal(canAccessAdmin('owner', false), false)
})

test('canUseSyncFeatures blocks inactive users', () => {
  assert.equal(canUseSyncFeatures(true), true)
  assert.equal(canUseSyncFeatures(false), false)
})

test('owners can transfer ownership to another active user', () => {
  const result = evaluateMembershipAction({
    actorId: 'owner-1',
    actorRole: 'owner',
    actorIsActive: true,
    targetId: 'admin-1',
    targetRole: 'admin',
    targetIsActive: true,
    action: 'transfer_ownership',
  })

  assert.deepEqual(result, { allowed: true, reason: null })
})

test('admins cannot transfer ownership', () => {
  const result = evaluateMembershipAction({
    actorId: 'admin-1',
    actorRole: 'admin',
    actorIsActive: true,
    targetId: 'member-1',
    targetRole: 'member',
    targetIsActive: true,
    action: 'transfer_ownership',
  })

  assert.deepEqual(result, { allowed: false, reason: 'owner_access_required' })
})

test('admins can deactivate members but not other admins', () => {
  const allowed = evaluateMembershipAction({
    actorId: 'admin-1',
    actorRole: 'admin',
    actorIsActive: true,
    targetId: 'member-1',
    targetRole: 'member',
    targetIsActive: true,
    action: 'deactivate',
  })

  const denied = evaluateMembershipAction({
    actorId: 'admin-1',
    actorRole: 'admin',
    actorIsActive: true,
    targetId: 'admin-2',
    targetRole: 'admin',
    targetIsActive: true,
    action: 'deactivate',
  })

  assert.deepEqual(allowed, { allowed: true, reason: null })
  assert.deepEqual(denied, { allowed: false, reason: 'admins_manage_members_only' })
})

test('owners cannot manage themselves or mutate the owner through generic actions', () => {
  const selfChange = evaluateMembershipAction({
    actorId: 'owner-1',
    actorRole: 'owner',
    actorIsActive: true,
    targetId: 'owner-1',
    targetRole: 'owner',
    targetIsActive: true,
    action: 'deactivate',
  })

  const ownerChange = evaluateMembershipAction({
    actorId: 'owner-1',
    actorRole: 'owner',
    actorIsActive: true,
    targetId: 'owner-2',
    targetRole: 'owner',
    targetIsActive: true,
    action: 'hard_delete',
  })

  assert.deepEqual(selfChange, { allowed: false, reason: 'cannot_manage_self' })
  assert.deepEqual(ownerChange, { allowed: false, reason: 'cannot_modify_owner' })
})

test('only members can self-delete from the profile flow', () => {
  assert.equal(canSelfDelete('member'), true)
  assert.equal(canSelfDelete('admin'), false)
  assert.equal(canSelfDelete('owner'), false)
})
