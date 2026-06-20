import express from 'express'

import { loadConfig } from '../lib/config.js'
const config = loadConfig()
const dr = config.docroot

// `public` and `private` are reserved words in module code, so they can't name
// function bindings; export them under those names for callers via aliases.
function registerPublic(app) {
  app.get('/favicon.ico', (req, res) => {
    res.sendFile('img/favicon.ico', { root: dr, maxAge: '7d' })
  })
  app.use('/img/', express.static(`${dr}/img`, { maxAge: '3d' }))
  app.use('/css/', express.static(`${dr}/css`, { maxAge: '1d' }))
  app.use('/js/', express.static(`${dr}/js`))
  app.use('/fonts/', express.static(`${dr}/fonts`, { maxAge: '10d' }))
}

export function index(app) {
  app.use('/', express.static(dr))
}

function registerPrivate(app) {
  app.use('/', express.static(dr, { redirect: false }))
}

export { registerPublic as public, registerPrivate as private }
