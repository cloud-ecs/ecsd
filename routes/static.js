'use strict'

const express = require('express')

const config = require('../lib/config').loadConfig()
const dr = config.docroot

exports.public = function (app) {
  app.get('/favicon.ico', (req, res) => {
    res.sendFile('img/favicon.ico', { root: dr, maxAge: '7d' })
  })
  app.use('/img/', express.static(`${dr}/img`, { maxAge: '3d' }))
  app.use('/css/', express.static(`${dr}/css`, { maxAge: '1d' }))
  app.use('/js/', express.static(`${dr}/js`))
  app.use('/fonts/', express.static(`${dr}/fonts`, { maxAge: '10d' }))
}

exports.index = function (app) {
  app.use('/', express.static(dr))
}

exports.private = function (app) {
  app.use('/', express.static(dr, { redirect: false }))
}
