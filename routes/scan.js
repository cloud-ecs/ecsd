'use strict'

const scanner = require('../lib/scanner')

exports.public = function (app) {
  app.post('/scan', scanner.post)
  app.get('/scan', scanner.get)

  app.get('/status/scannersAll', scanner.listAll)
  app.get('/status/scannersAvailable', scanner.listAvailable)
}
