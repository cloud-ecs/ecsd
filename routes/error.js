'use strict'

const config = require('../lib/config').loadConfig()

exports.addErrRoutes = function (app) {
  this.load404(app)
  this.loadUnhandled(app)
}

exports.load404 = function (app) {
  app.use(function (req, res) {
    if (req.accepts('html')) {
      res.status(404).sendFile('404.html', {
        root: config.docroot,
      })
      return
    }

    if (req.accepts('json')) {
      res.status(404).send({
        err: 'Not found',
      })
      return
    }

    res.status(404).send('Not found!')
  })
}

exports.loadUnhandled = function (app) {
  // Express only treats middleware as an error handler when it declares 4 args
  app.use(function (err, req, res, _next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })
}
