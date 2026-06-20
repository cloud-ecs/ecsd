import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { findSocket } from '../lib/detect-socket.js'

describe('detect-socket', () => {
  it.skip('finds clamd.socket', async () => {
    assert.ok(await findSocket('clamd.socket', ['/tmp']))
  })

  it('does not file files that are not sockets', async () => {
    assert.equal(await findSocket('resolv.conf', ['/etc']), undefined)
  })
})
