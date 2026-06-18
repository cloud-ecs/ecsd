'use strict'

const http = require('node:http')

const express = require('express')
const logger = require('morgan')

const config = require('./lib/config').loadConfig()

const app = express()
app.use(logger('dev'))

require('./routes/static').public(app)

http.createServer(app).listen(config.listen.port)
console.log(`Listening on port ${config.listen.port}`)

require('./routes/scan').public(app)

require('./routes/static').index(app)
require('./routes/error').addErrRoutes(app)
