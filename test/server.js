'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { describe, it, before, after } = require('node:test')
const express = require('express')

const app = express()
require('../routes/scan').public(app)

describe('routes, scan', () => {
  let server
  let base

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, resolve)
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(() => server.close())

  describe('GET /scan', () => {
    it('responds with an upload form', async () => {
      const res = await fetch(`${base}/scan`, {
        headers: { Accept: 'text/html' },
      })
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type'), /html/)
      assert.match(await res.text(), /file/)
    })
  })

  describe('POST /scan', () => {
    it('responds with a JSON array of scan results', async () => {
      const body = await fs.readFile('test/files/eicar.eml')
      const res = await fetch(`${base}/scan`, { method: 'POST', body })
      assert.equal(res.status, 200)
      assert.ok(Array.isArray(await res.json()))
    })
  })
})
