'use strict'

const path = require('node:path')

const { formidable } = require('formidable')

const logger = require('./logger')
const cfg = require('./config').loadConfig()
const spoolDir = path.resolve(cfg.spool.dir)

exports.scanners = [
  'spamassassin',
  'rspamd',
  'dspam',
  'messagesniffer',
  'dcc',
  'virustotal',
  'fprot',
  'f-secure',
  'clamav',
  'avg',
  'eset',
  'kaspersky',
  'comodo',
  'bitdefender',
  'opendkim',
  'opendmarc',
]

exports.availableScanners = {}

exports.scanFns = {}

exports.testScanner = async function (s) {
  let scanner
  try {
    scanner = require('./' + s).createScanner()
  } catch {
    logger.error('could not load: ' + s)
    return
  }

  try {
    if (await scanner.isAvailable()) {
      exports.availableScanners[s] = scanner
    } else {
      logger.error('not available: ' + s)
    }
  } catch {
    /* availability probe failed; leave scanner out */
  }
}

exports.post = function (req, res) {
  const form = formidable({
    uploadDir: spoolDir,
    keepExtensions: true,
  })

  form.parse(req, async (err, fields, files) => {
    if (err) {
      logger.error(err)
      return
    }

    const uploaded = Object.values(files)[0]
    if (!uploaded) {
      res.status(400).json({ err: 'no file uploaded' })
      return
    }

    const file = uploaded[0].filepath
    const scanners = Object.values(exports.availableScanners)

    try {
      const results = await Promise.all(
        scanners.map((scanner) => scanOne(scanner, file)),
      )
      res.json(results)
    } catch (e) {
      logger.error(e)
      res.json({ err: e.message })
    }
  })
}

async function scanOne(scanner, file) {
  try {
    return await scanner.scan(file)
  } catch (e) {
    logger.error(e)
    return null
  }
}

exports.get = function (req, res) {
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(
    '<form action="/scan" enctype="multipart/form-data" method="post">' +
      '<input type="text" name="title"><br>' +
      '<input type="file" name="upload" multiple="multiple"><br>' +
      '<input type="submit" value="Upload">' +
      '</form>',
  )
}

exports.listAll = function (req, res) {
  res.json({ scanners: exports.scanners })
}

exports.listAvailable = function (req, res) {
  res.json({ scanners: exports.availableScanners })
}

exports.scanners.forEach(exports.testScanner)

// re-test scanner availability every 2 minutes; unref so it never keeps a
// short-lived process (e.g. the test runner) alive on its own
setInterval(function () {
  exports.scanners.forEach(exports.testScanner)
}, 120 * 1000).unref()
