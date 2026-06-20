import http from 'node:http'

import express from 'express'

import { loadConfig } from './lib/config.js'
import * as staticRoutes from './routes/static.js'
import * as scanRoutes from './routes/scan.js'
import * as errorRoutes from './routes/error.js'

const config = loadConfig()

const app = express()
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    console.log(`${req.method} ${req.url} ${res.statusCode} ${ms.toFixed(1)}ms`)
  })
  next()
})

staticRoutes.public(app)

http.createServer(app).listen(config.listen.port)
console.log(`Listening on port ${config.listen.port}`)

scanRoutes.public(app)

staticRoutes.index(app)
errorRoutes.addErrRoutes(app)
