import test from 'node:test'
import assert from 'node:assert/strict'
import { isMissingInstanceGovernanceError } from '../lib/instance-governance.ts'

test('isMissingInstanceGovernanceError recognizes missing governance table errors', () => {
  assert.equal(
    isMissingInstanceGovernanceError({
      message: "Could not find the table 'public.instance_memberships' in the schema cache",
    }),
    true,
  )
})

test('isMissingInstanceGovernanceError recognizes missing governance function errors', () => {
  assert.equal(
    isMissingInstanceGovernanceError({
      message: 'Could not find the function public.ensure_instance_membership(p_user_id)',
    }),
    true,
  )
})

test('isMissingInstanceGovernanceError ignores unrelated errors', () => {
  assert.equal(
    isMissingInstanceGovernanceError({
      message: 'permission denied for table user_stats',
    }),
    false,
  )
})
