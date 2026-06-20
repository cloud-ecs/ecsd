import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it, before } from 'node:test'

import { createScanner } from '../lib/opendkim.js'
const opendkim = createScanner()

const signedValidMsg = path.resolve('test/files/dkim-valid.eml')
const signedInvalidMsg = path.resolve('test/files/dkim-invalid.eml')
const unsignedMsg = path.resolve('test/files/clean.eml')

describe('opendkim', () => {
  let found
  before(async () => {
    found = await opendkim.binFound().catch(() => false)
  })

  it('is found', (t) => {
    if (!found) return t.skip()
    assert.ok(found)
  })

  it('is available', async (t) => {
    if (!found) return t.skip()
    assert.ok(await opendkim.isAvailable())
  })

  it('valid signed message yields pass', async (t) => {
    if (!found) return t.skip()
    const results = await opendkim.scanBin(signedValidMsg)
    assert.ok(results.pass.length > 0)
  })

  it('invalid signed message yields fail', async (t) => {
    if (!found) return t.skip()
    const results = await opendkim.scanBin(signedInvalidMsg)
    assert.ok(results.fail.length > 0)
  })

  it('unsigned message yields failure', async (t) => {
    if (!found) return t.skip()
    const results = await opendkim.scanBin(unsignedMsg)
    assert.ok(results.fail.length > 0)
  })
})
