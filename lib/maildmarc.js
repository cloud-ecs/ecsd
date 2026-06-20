import fs from 'node:fs'
import http from 'node:http'
import util from 'node:util'

import * as logger from './logger.js'
import * as env from './envelope.js'
import BaseScanner from './base-scanner.js'

// Mail::DMARC's HTTP service (mail-dmarc-httpd). The validate endpoint reads a
// JSON body as CGI POSTDATA and passes its keys to Mail::DMARC::PurePerl->new,
// then returns the JSON Result. https://metacpan.org/pod/Mail::DMARC::HTTP
const VALIDATE_PATH = '/dmarc/json/validate'

// RFC 7208 §2.6 SPF result codes Mail::DMARC will accept.
const SPF_RESULTS = new Set([
  'none',
  'neutral',
  'pass',
  'fail',
  'softfail',
  'temperror',
  'permerror',
])

class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'maildmarc'

    this.init()

    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
    if (!this.cfg.net.port) this.cfg.net.port = '8080'

    logger.debug(util.inspect(this, { depth: null }))
  }

  async isFound() {
    try {
      if (await this.tcpListening()) {
        this.found.any = 'tcp'
        return this.found.any
      }
    } catch (err) {
      logger.error(err)
    }

    this.found.any = false
    return this.found.any
  }

  async isAvailable() {
    try {
      if (await this.tcpAvailable()) {
        this.available.any = 'tcp'
        return this.available.any
      }
    } catch {
      /* not available */
    }

    this.available.any = false
    return this.available.any
  }

  ping() {
    return this.post('{}').then(() => true)
  }

  async tcpAvailable() {
    await this.tcpListening()
    this.available.tcp = await this.ping()
    return this.available.tcp
  }

  async scanTcp(file, envelope = []) {
    const request = await this.buildRequest(file, envelope)
    const response = await this.post(JSON.stringify(request))
    return this.parseScanReply(response)
  }

  // DMARC evaluates the RFC5322.From domain against SPF/DKIM alignment, so the
  // inputs come from the envelope and message headers, not the message body.
  // header_from_raw lets Mail::DMARC parse the From domain itself (incl. the
  // multi-address Sender fallback in RFC 7489 §6.6.1).
  async buildRequest(file, envelope) {
    const request = {}

    const sourceIp = env.get(envelope, 'IP')
    if (sourceIp) request.source_ip = sourceIp

    const headerFrom = await this.readFromHeader(file)
    if (headerFrom) request.header_from_raw = headerFrom

    const mailFrom = domainOf(env.get(envelope, 'From'))
    if (mailFrom) request.envelope_from = mailFrom

    const rcptTo = domainOf(env.getAll(envelope, 'Rcpt')[0])
    if (rcptTo) request.envelope_to = rcptTo

    const spfResult = (env.get(envelope, 'SPF') || '').toLowerCase()
    if (mailFrom && SPF_RESULTS.has(spfResult)) {
      request.spf = [{ domain: mailFrom, scope: 'mfrom', result: spfResult }]
    }

    return request
  }

  async readFromHeader(file) {
    const raw = await fs.promises.readFile(file, 'utf8')
    const head = raw.split(/\r?\n\r?\n/, 1)[0]
    // RFC 5322 §2.2.3: a header may fold onto continuation lines that begin
    // with whitespace.
    const match = head.match(/^From:[^\n]*(?:\r?\n[ \t][^\n]*)*/im)
    return match ? match[0].replace(/\r?\n/g, ' ').trim() : undefined
  }

  post(body) {
    const httpOpts = {
      host: this.cfg.net.host,
      port: this.cfg.net.port,
      path: VALIDATE_PATH,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }

    return new Promise((resolve, reject) => {
      let rawResponse = ''
      const req = http.request(httpOpts, (res) => {
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          rawResponse += chunk
        })
        res.on('end', () => resolve(rawResponse))
      })

      req.on('error', reject)
      req.end(body)
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
    if (!parsed || !parsed.result) return result

    // A 'none' result means no DMARC policy was published (or the From domain
    // could not be evaluated) — informational, not an alignment failure.
    if (parsed.result === 'pass') {
      result.pass.push(parsed.disposition || 'pass')
    } else if (parsed.result === 'fail') {
      result.fail.push(parsed.disposition || 'fail')
    } else {
      result.pass.push(parsed.result)
    }

    return result
  }
}

function domainOf(address) {
  if (!address) return undefined
  const at = address.lastIndexOf('@')
  if (at === -1) return undefined
  const domain = address
    .slice(at + 1)
    .replace(/[>;\s,].*$/, '')
    .toLowerCase()
  return domain || undefined
}

export function createScanner(name) {
  return new Scanner(name)
}
