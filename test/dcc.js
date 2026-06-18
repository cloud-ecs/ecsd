'use strict'

const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it, before } = require('node:test')

const dcc = require('../lib/dcc').createScanner()

const cleanMsg = path.resolve('test/files/clean.eml')

describe('dcc', () => {
  describe('parseScanReply', () => {
    it('passes an accept disposition', () => {
      const results = dcc.parseScanReply('A\nA\nX-DCC-Reputation: ok\n')
      assert.equal(results.pass.length, 1)
      assert.equal(results.fail.length, 0)
    })

    it('fails a reject disposition', () => {
      const results = dcc.parseScanReply('R\nR\n')
      assert.equal(results.fail.length, 1)
      assert.equal(results.pass.length, 0)
    })

    it('errors on a temporary failure', () => {
      const results = dcc.parseScanReply('T\n')
      assert.equal(results.error.length, 1)
    })
  })

  describe('requestPreamble', () => {
    it('uses placeholders with no envelope', () => {
      assert.equal(
        dcc.requestPreamble(),
        'header\n127.0.0.1\nlocalhost\n\npostmaster\n\n',
      )
    })

    it('builds the dccifd envelope from request metadata', () => {
      const env = [
        ['IP', '203.0.113.7'],
        ['Helo', 'mail.example.com'],
        ['From', 'sender@example.com'],
        ['Rcpt', 'a@example.net'],
        ['Rcpt', 'b@example.net'],
      ]
      assert.equal(
        dcc.requestPreamble(env),
        'header\n203.0.113.7\nmail.example.com\nsender@example.com\na@example.net\nb@example.net\n\n',
      )
    })
  })

  describe('TCP', () => {
    let avail
    before(async () => {
      avail = await dcc.tcpListening().catch(() => false)
    })

    it('is available', async (t) => {
      if (!avail) return t.skip()
      assert.ok(await dcc.tcpAvailable())
    })

    // DCC flags mail by clearinghouse checksum counts, so a one-off message
    // can't be forced to "reject"; assert the daemon returns a parsed verdict.
    it('scans a message', async (t) => {
      if (!avail) return t.skip()
      const results = await dcc.scanTcp(cleanMsg)
      assert.equal(results.error.length, 0)
      assert.equal(results.pass.length + results.fail.length, 1)
    })
  })

  describe('unix socket', () => {
    let avail
    before(async () => {
      avail = await dcc.socketFound().catch(() => false)
    })

    it('scans a message', async (t) => {
      if (!avail) return t.skip()
      const results = await dcc.scanSocket(cleanMsg)
      assert.equal(results.error.length, 0)
      assert.equal(results.pass.length + results.fail.length, 1)
    })
  })

  describe('scan dispatch', () => {
    let avail
    before(async () => {
      avail = await dcc.isAvailable().catch(() => false)
    })

    it('scans a message', async (t) => {
      if (!avail) return t.skip()
      const results = await dcc.scan(cleanMsg)
      assert.equal(results.error.length, 0)
      assert.equal(results.pass.length + results.fail.length, 1)
    })
  })
})
