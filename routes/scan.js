import * as scanner from '../lib/scanner.js'

// `public` is a reserved word in module code, so it can't name a function
// binding; export it under that name for callers via an alias.
function registerPublic(app) {
  app.post('/scan', scanner.post)
  app.get('/scan', scanner.get)

  app.get('/status/scannersAll', scanner.listAll)
  app.get('/status/scannersAvailable', scanner.listAvailable)
}

export { registerPublic as public }
