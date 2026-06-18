'use strict'

const { describe, it } = require('node:test')
const supertest = require('supertest')
const express = require('express')

const logger = require('../lib/logger')
const app = express()
app.enable('trust proxy')

require('../routes/scan').public(app)

describe('routes, scan', () => {
  const agent = supertest.agent(app)

  describe('GET /scan', () => {
    it('responds with scan form', () => {
      return agent
        .get('/scan')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(/file/)
        .expect(200)
    })
  })

  describe('POST /scan', () => {
    it('responds with JSON scan results', { timeout: 3000 }, () => {
      return agent
        .post('/scan')
        .attach('virus', 'test/files/eicar.eml')
        .set('Accept', 'json')
        .expect((res) => {
          logger.debug(res.body)
          if (res.body.success && res.body.extra.exists) {
            return 'should not return success'
          }
        })
        .expect(200)
    })
  })
})
