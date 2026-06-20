process.env.NODE_ENV = 'test'

import assert from 'node:assert/strict'
import { describe, it, before } from 'node:test'

import { createScanner } from '../lib/maildmarc.js'
const maildmarc = createScanner()

describe('maildmarc', () => {
  describe('parseScanReply', () => {
    it('maps a DMARC pass to a pass with its disposition', () => {
      const r = maildmarc.parseScanReply(
        JSON.stringify({ result: 'pass', disposition: 'none' }),
      )
      assert.deepEqual(r.pass, ['none'])
      assert.equal(r.fail.length, 0)
      assert.equal(r.error.length, 0)
    })

    it('maps a DMARC fail to a fail with its disposition', () => {
      const r = maildmarc.parseScanReply(
        JSON.stringify({ result: 'fail', disposition: 'reject' }),
      )
      assert.deepEqual(r.fail, ['reject'])
      assert.equal(r.pass.length, 0)
    })

    it('treats a no-policy "none" result as informational, not a failure', () => {
      const r = maildmarc.parseScanReply(JSON.stringify({ result: 'none' }))
      assert.deepEqual(r.pass, ['none'])
      assert.equal(r.fail.length, 0)
    })

    it('records a parse error for non-JSON', () => {
      const r = maildmarc.parseScanReply('<html>not json</html>')
      assert.equal(r.error.length, 1)
    })
  })

  describe('readFromHeader', () => {
    it('extracts the raw From header from a message', async () => {
      const from = await maildmarc.readFromHeader(maildmarc.passFile)
      assert.match(from, /^From:.*@example\.net/)
    })
  })

  describe('buildRequest', () => {
    it('derives DMARC inputs from the envelope and message', async () => {
      const envelope = [
        ['IP', '192.0.2.1'],
        ['From', '<bounce@sender.example.com>'],
        ['Rcpt', 'rcpt@example.org'],
        ['SPF', 'pass'],
      ]
      const req = await maildmarc.buildRequest(maildmarc.passFile, envelope)

      assert.equal(req.source_ip, '192.0.2.1')
      assert.equal(req.envelope_from, 'sender.example.com')
      assert.equal(req.envelope_to, 'example.org')
      assert.match(req.header_from_raw, /^From:/)
      assert.deepEqual(req.spf, [
        { domain: 'sender.example.com', scope: 'mfrom', result: 'pass' },
      ])
    })

    it('omits spf when the result code is not recognized', async () => {
      const envelope = [
        ['From', 'bounce@sender.example.com'],
        ['SPF', 'unknown'],
      ]
      const req = await maildmarc.buildRequest(maildmarc.passFile, envelope)
      assert.equal(req.spf, undefined)
    })
  })

  describe('TCP', () => {
    let avail
    before(async () => {
      avail = await maildmarc.tcpListening().catch(() => false)
    })

    it('pings', async (t) => {
      if (!avail) return t.skip()
      assert.ok(await maildmarc.tcpAvailable())
    })

    it('validates a message', async (t) => {
      if (!avail) return t.skip()
      const results = await maildmarc.scanTcp(maildmarc.passFile, [
        ['IP', '192.0.2.1'],
      ])
      assert.equal(results.error.length, 0)
      assert.ok(results.pass.length || results.fail.length)
    })
  })
})
