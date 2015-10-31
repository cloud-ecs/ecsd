'use strict';

// node.js built-ins
// var crypto     = require('crypto');
// var fs         = require('fs');
var http          = require('http');
// var https      = require('https');

// npm deps
var express     = require('express');

// local deps
var logger      = require('morgan');

// var logger      = require('./lib/logger');
var config      = require('./lib/config').loadConfig();

var app = express();
app.use(logger('dev'));

require('./routes/static').public(app);

http.createServer(app).listen(config.listen.port);
console.log('Listening on port %d', config.listen.port);


// the session is valid, continue
// require('./routes/static').private(app);

require('./routes/error').addErrRoutes(app);
