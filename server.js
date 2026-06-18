'use strict'

const http = require('node:http')

const express = require('express')

const config = require('./lib/config').loadConfig()

const app = express()
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    console.log(`${req.method} ${req.url} ${res.statusCode} ${ms.toFixed(1)}ms`)
  })
  next()
})

require('./routes/static').public(app)

http.createServer(app).listen(config.listen.port)
console.log(`Listening on port ${config.listen.port}`)

require('./routes/scan').public(app)

require('./routes/static').index(app)
require('./routes/error').addErrRoutes(app)
