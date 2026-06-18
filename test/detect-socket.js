'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const findSocket = require('../lib/detect-socket').findSocket

describe('detect-socket', () => {
  it.skip('finds clamd.socket', async () => {
    assert.ok(await findSocket('clamd.socket', ['/tmp']))
  })

  it('does not file files that are not sockets', async () => {
    assert.equal(await findSocket('resolv.conf', ['/etc']), undefined)
  })
})
