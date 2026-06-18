'use strict'

// node.js built-ins
const http = require('node:http')
// const https = require('node:https');

const express = require('express')
const logger = require('morgan')

// const logger = require('./lib/logger');
const config = require('./lib/config').loadConfig()

const app = express()
app.use(logger('dev'))

require('./routes/static').public(app)

http.createServer(app).listen(config.listen.port)
console.log('Listening on port %d', config.listen.port)

require('./routes/scan').public(app)

// the session is valid, continue
// require('./routes/static').private(app);

require('./routes/static').index(app)
require('./routes/error').addErrRoutes(app)
