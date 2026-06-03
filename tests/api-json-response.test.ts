import assert from 'node:assert/strict'
import test from 'node:test'
import { parseApiJsonResponse } from '../lib/api-json-response.ts'

test('parseApiJsonResponse returns parsed success payloads', async () => {
  const response = new Response(JSON.stringify({ hello: 'world' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

  const result = await parseApiJsonResponse<{ hello: string }>(response, 'Failed to load data')
  assert.equal(result.error, null)
  assert.deepEqual(result.data, { hello: 'world' })
})

test('parseApiJsonResponse handles empty success bodies without throwing', async () => {
  const response = new Response(null, {
    status: 204,
    headers: { 'content-type': 'application/json' },
  })

  const result = await parseApiJsonResponse(response, 'Failed to load data')
  assert.equal(result.error, null)
  assert.equal(result.data, null)
})

test('parseApiJsonResponse surfaces json error messages', async () => {
  const response = new Response(JSON.stringify({ error: 'User not found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  })

  const result = await parseApiJsonResponse(response, 'Failed to load profile stats')
  assert.equal(result.data, null)
  assert.equal(result.error, 'User not found')
})

test('parseApiJsonResponse handles non-json error responses without parse crashes', async () => {
  const response = new Response('Internal Server Error', {
    status: 500,
    headers: { 'content-type': 'text/plain' },
  })

  const result = await parseApiJsonResponse(response, 'Failed to load activity')
  assert.equal(result.data, null)
  assert.equal(result.error, 'Internal Server Error')
})

test('parseApiJsonResponse reports malformed success payloads cleanly', async () => {
  const response = new Response('{"broken"', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

  const result = await parseApiJsonResponse(response, 'Failed to load activity')
  assert.equal(result.data, null)
  assert.equal(result.error, 'Failed to load activity returned invalid JSON.')
})
