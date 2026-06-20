import assert from 'node:assert/strict'
import { describe, it, before } from 'node:test'

import { createScanner, EICAR_SHA256 } from '../lib/virustotal.js'
const vt = createScanner()

describe('virustotal', () => {
  describe('parseScanReply', () => {
    it('fails a file with detections', () => {
      const report = {
        data: {
          attributes: {
            last_analysis_stats: {
              malicious: 42,
              suspicious: 1,
              harmless: 0,
              undetected: 20,
            },
          },
        },
      }
      const results = vt.parseScanReply(report)
      assert.equal(results.fail.length, 1)
      assert.equal(results.pass.length, 0)
    })

    it('passes a clean file', () => {
      const report = {
        data: {
          attributes: {
            last_analysis_stats: {
              malicious: 0,
              suspicious: 0,
              harmless: 5,
              undetected: 60,
            },
          },
        },
      }
      const results = vt.parseScanReply(report)
      assert.equal(results.pass.length, 1)
      assert.equal(results.fail.length, 0)
    })

    it('reads stats from an analysis response', () => {
      const report = {
        data: {
          attributes: {
            status: 'completed',
            stats: { malicious: 3, suspicious: 0, harmless: 0, undetected: 10 },
          },
        },
      }
      const results = vt.parseScanReply(report)
      assert.equal(results.fail.length, 1)
    })

    it('errors when stats are missing', () => {
      const results = vt.parseScanReply({ data: { attributes: {} } })
      assert.equal(results.error.length, 1)
    })
  })

  describe('live API', () => {
    let avail
    before(async () => {
      avail = await vt.isAvailable().catch(() => false)
    })

    // Look up EICAR's well-known hash rather than scanning a file, so the test
    // exercises the real API and parser without uploading anything.
    it('flags the eicar hash as malicious', async (t) => {
      if (!avail) return t.skip()
      const report = await vt.lookup(EICAR_SHA256)
      const results = vt.parseScanReply(report)
      assert.ok(results.fail.length)
    })
  })
})
