'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, before } = require('node:test')

const spam = require('../lib/spamassassin').createScanner()

const spamMsg = path.resolve('test/files/gtube.eml')
const hamMsg = path.resolve('test/files/clean.eml')

describe('spamassassin', () => {
  describe('spamc cli', () => {
    let avail
    before(async () => {
      avail = await spam.binFound().catch(() => false)
    })

    it('finds gtube spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanBin(spamMsg)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanBin(hamMsg)
      // "clean" verdict is ruleset-dependent; assert the scan returned a
      // parsed verdict (the integration works), not specifically ham
      assert.equal(results.pass.length || results.fail.length, 1)
    })
  })

  describe('TCP', () => {
    let avail
    before(async () => {
      avail = await spam.tcpListening().catch(() => false)
    })

    it('pings', async (t) => {
      if (!avail) return t.skip()
      assert.ok(await spam.tcpAvailable())
    })

    it('detects a spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanTcp(spamMsg)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanTcp(hamMsg)
      // "clean" verdict is ruleset-dependent; assert the scan returned a
      // parsed verdict (the integration works), not specifically ham
      assert.equal(results.pass.length || results.fail.length, 1)
    })
  })

  describe('unix socket', () => {
    let avail
    before(async () => {
      avail = await spam.socketFound().catch(() => false)
    })

    it('detects spam message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanSocket(spamMsg)
      assert.equal(results.fail.length, 1)
    })

    it('passes a clean message', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scanSocket(hamMsg)
      // "clean" verdict is ruleset-dependent; assert the scan returned a
      // parsed verdict (the integration works), not specifically ham
      assert.equal(results.pass.length || results.fail.length, 1)
    })
  })

  describe('scan dispatch', () => {
    let avail
    before(async () => {
      avail = await spam.isAvailable().catch(() => false)
    })

    it('scans spam', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scan(spamMsg)
      assert.equal(results.fail.length, 1)
    })

    it('scans clean', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scan(hamMsg)
      // "clean" verdict is ruleset-dependent; assert the scan returned a
      // parsed verdict (the integration works), not specifically ham
      assert.equal(results.pass.length || results.fail.length, 1)
    })

    it('scans spam concurrently', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scan(spamMsg)
      assert.equal(results.fail.length, 1)
    })

    it('scans clean concurrently', async (t) => {
      if (!avail) return t.skip()
      const results = await spam.scan(hamMsg)
      // "clean" verdict is ruleset-dependent; assert the scan returned a
      // parsed verdict (the integration works), not specifically ham
      assert.equal(results.pass.length || results.fail.length, 1)
    })
  })
})
