import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import * as envelope from '../lib/envelope.js'

const req = {
  rawHeaders: [
    'Content-Type',
    'message/rfc822',
    'X-Env-IP',
    '203.0.113.7',
    'X-Env-Helo',
    'mail.example.com',
    'X-Env-From',
    'sender@example.com',
    'X-Env-Rcpt',
    'a@example.net',
    'X-Env-Rcpt',
    'b@example.net',
    'X-Env-TLS-Version',
    'TLSv1.3',
  ],
}

describe('envelope', () => {
  it('captures only X-Env-* headers, prefix stripped, casing preserved', () => {
    const env = envelope.fromRequest(req)
    assert.deepEqual(env, [
      ['IP', '203.0.113.7'],
      ['Helo', 'mail.example.com'],
      ['From', 'sender@example.com'],
      ['Rcpt', 'a@example.net'],
      ['Rcpt', 'b@example.net'],
      ['TLS-Version', 'TLSv1.3'],
    ])
  })

  it('get() returns the first value, case-insensitively', () => {
    const env = envelope.fromRequest(req)
    assert.equal(envelope.get(env, 'ip'), '203.0.113.7')
    assert.equal(envelope.get(env, 'Helo'), 'mail.example.com')
    assert.equal(envelope.get(env, 'missing'), undefined)
  })

  it('getAll() returns every value for repeated fields', () => {
    const env = envelope.fromRequest(req)
    assert.deepEqual(envelope.getAll(env, 'rcpt'), [
      'a@example.net',
      'b@example.net',
    ])
  })

  it('tolerates a request with no headers', () => {
    assert.deepEqual(envelope.fromRequest({}), [])
  })
})
