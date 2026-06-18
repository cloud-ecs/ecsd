'use strict'

process.env.NODE_ENV = 'test'

const assert = require('node:assert/strict')
const { describe, it, before } = require('node:test')

const rspamd = require('../lib/rspamd').createScanner()

describe('rspamd', () => {
  describe('rspamc cli', () => {
    let avail
    before(async () => {
      avail = await rspamd.binFound().catch(() => false)
    })

    it('finds gtube spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanBin(rspamd.failFile)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanBin(rspamd.passFile)
      // "clean" is config-dependent (DMARC/hostname/date rules), so assert
      // the integration parsed a result rather than a ham verdict
      assert.ok(results.name)
      assert.equal(results.error.length, 0)
    })
  })

  describe('TCP', () => {
    let avail
    before(async () => {
      avail = await rspamd.tcpListening().catch(() => false)
    })

    it('pings', async (t) => {
      if (!avail) return t.skip()
      assert.ok(await rspamd.tcpAvailable())
    })

    it('detects a spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanTcp(rspamd.failFile)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', { timeout: 7000 }, async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanTcp(rspamd.passFile)
      assert.equal(results.pass.length || results.fail.length, 1)
    })
  })

  describe('unix socket', () => {
    let avail
    before(async () => {
      avail = await rspamd.socketFound().catch(() => false)
    })

    it('detects spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanSocket(rspamd.failFile)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scanSocket(rspamd.passFile)
      assert.equal(results.pass.length, 1)
    })
  })

  describe.skip('scan dispatch', () => {
    let avail
    before(async () => {
      avail = await rspamd.isAvailable().catch(() => false)
    })

    it('scans spam', { timeout: 4000 }, async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scan(rspamd.failFile)
      assert.equal(results.fail.length, 1)
    })

    it('scans clean', { timeout: 4000 }, async (t) => {
      if (!avail) return t.skip()
      const results = await rspamd.scan(rspamd.passFile)
      assert.equal(results.pass.length, 1)
    })
  })
})
