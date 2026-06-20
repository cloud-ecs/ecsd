import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { findBin } from '../lib/detect-cli.js'

describe('detect-cli', () => {
  it('finds the bin "which"', async () => {
    assert.ok(await findBin('which', []))
  })

  it('does not find the bin "does-not-ever-exist"', async () => {
    assert.equal(await findBin('does-not-ever-exist', []), undefined)
  })
})
