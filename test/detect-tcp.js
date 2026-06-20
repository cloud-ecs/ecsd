import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { findTcp } from '../lib/detect-tcp.js'

describe('detect-tcp', () => {
  it.skip('detects a listening port', async () => {
    assert.ok(await findTcp({ port: 3310 }))
  })

  it('detects a non-listening port', async () => {
    await assert.rejects(() => findTcp({ port: 3311 }))
  })
})
