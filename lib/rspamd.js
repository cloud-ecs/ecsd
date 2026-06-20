import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import util from 'node:util'

import * as logger from './logger.js'
import BaseScanner from './base-scanner.js'

class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'rspamd'

    this.init()

    if (!this.cfg.socket) this.cfg.socket = 'rspamd.socket'
    if (!this.cfg.cli.bin) this.cfg.cli.bin = 'rspamc'
    if (!this.cfg.cli.args) this.cfg.cli.args = ' --json < '
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
    if (!this.cfg.net.port) this.cfg.net.port = '11333'

    this.failFile = path.resolve('test/files/gtube.eml')
    this.passFile = path.resolve('test/files/clean.eml')

    logger.debug(util.inspect(this, { depth: null }))
  }

  ping() {
    const httpOpts = {
      host: this.cfg.net.host,
      port: this.cfg.net.port,
      path: '/scan',
      method: 'POST',
      headers: {},
    }

    return new Promise((resolve, reject) => {
      const req = http.request(httpOpts, (res) => {
        res.setEncoding('utf8')
        res.on('data', () => {})
        res.on('end', () => resolve(true))
      })

      req.on('error', (err) => {
        console.error(err)
        reject(err)
      })
      req.end()
    })
  }

  parseScanReply(response) {
    const result = {
      pass: [],
      fail: [],
      name: this.name,
      api: this.available.any,
      raw: response,
      error: [],
    }

    let parsed
    try {
      parsed = JSON.parse(response)
    } catch (e) {
      result.error.push(e.message)
      return result
    }
    if (!parsed) return result

    // HTTP /check returns { default: {...} }; `rspamc --json` returns an
    // array of results (or a bare result object)
    const r = Array.isArray(parsed) ? parsed[0] : parsed.default || parsed
    if (!r) return result

    const spammy =
      r.is_spam === true ||
      (typeof r.action === 'string' && !/^(no action|greylist)$/.test(r.action))
    if (spammy) {
      result.fail.push(r.score)
    } else {
      result.pass.push(r.score)
    }

    return result
  }

  async tcpAvailable() {
    const pings = await this.ping()
    this.available.tcp = pings
    return pings
  }

  async scanTcp(file, envelope = []) {
    if (!this.available.tcp) throw new Error('TCP listener not found')

    const filePath = path.resolve(file)
    const stat = await fs.promises.stat(filePath)

    // Forward envelope metadata (IP, Helo, From, Rcpt, User, Hostname, SPF,
    // Queue-Id, TLS-*, ...) as rspamd's native request headers; repeated names
    // (e.g. Rcpt) become an array, which http emits as multiple headers.
    // https://rspamd.com/doc/architecture/protocol.html
    const headers = {}
    for (const [name, value] of envelope) {
      headers[name] = name in headers ? [].concat(headers[name], value) : value
    }
    headers.Pass = 'all'
    headers['Message-Length'] = stat.size

    const httpOpts = {
      host: this.cfg.net.host,
      port: this.cfg.net.port,
      path: '/check',
      method: 'POST',
      headers,
    }

    return new Promise((resolve, reject) => {
      let rawResponse = ''

      const req = http.request(httpOpts, (res) => {
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          rawResponse += chunk
        })
        res.on('end', () => resolve(this.parseScanReply(rawResponse)))
      })

      req.on('error', (e) => {
        console.log('problem with request: ' + e.message)
        reject(e)
      })

      fs.createReadStream(filePath).pipe(req)
    })
  }
}

export function createScanner(name) {
  return new Scanner(name)
}
