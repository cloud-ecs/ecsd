'use strict'

const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const logger = require('./logger')
const env = require('./envelope')
const BaseScanner = require('./base-scanner')

// dccifd protocol: http://www.dcc-servers.net/dcc/dcc-tree/dccifd.html
class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'dcc'

    this.init()

    // dccifd's listener socket (the DCC home dir default); set this in config
    // to match your daemon. findSocket also searches /tmp and /var/run.
    if (!this.cfg.socket) this.cfg.socket = '/var/dcc/dccifd'
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
    if (!this.cfg.net.port) this.cfg.net.port = '1025'

    this.failFile = path.resolve('test/files/gtube.eml')
    this.passFile = path.resolve('test/files/clean.eml')
  }

  // The dccifd envelope precedes the message: an options line, then client IP,
  // HELO, sender, and recipient(s), terminated by a blank line. We populate it
  // from the request envelope when present, falling back to placeholders (DCC's
  // bulk detection keys off the body checksums, not the envelope).
  requestPreamble(envelope = []) {
    const rcpts = env.getAll(envelope, 'Rcpt')
    const lines = [
      'header',
      env.get(envelope, 'IP') || '127.0.0.1',
      env.get(envelope, 'Helo') || 'localhost',
      env.get(envelope, 'From') || '',
      ...(rcpts.length ? rcpts : ['postmaster']),
    ]
    return lines.join('\n') + '\n\n'
  }

  parseScanReply(response) {
    const result = {
      pass: [],
      fail: [],
      name: this.name,
      raw: response,
      error: [],
    }

    // First line is the overall disposition; remaining lines are per-recipient
    // dispositions and any requested X-DCC headers.
    const code = response.split('\n').shift().trim()

    switch (code) {
      case 'A': // accept
      case 'S': // accept for some recipients
        result.pass.push(code)
        break
      case 'R': // reject — bulk/spam
      case 'G': // greylist
        result.fail.push(code)
        break
      case 'T': // temporary failure
        result.error.push('dccifd temporary failure')
        break
      default:
        result.error.push(response)
    }

    return result
  }

  // dccifd has no PING; prove the transport by scanning a known-clean message
  // and confirming the daemon returned a parseable disposition.
  async tcpAvailable() {
    await this.tcpListening()
    if (!this.found.tcp) throw new Error('dccifd not listening')

    const results = await this.scanTcp(this.passFile)
    if (results.error.length) throw new Error('dccifd health check failed')

    this.available.tcp = true
    return true
  }

  async socketAvailable() {
    await this.socketFound()
    if (!this.found.socket) throw new Error('dccifd socket not found')

    const results = await this.scanSocket(this.passFile)
    if (results.error.length) throw new Error('dccifd health check failed')

    this.available.socket = true
    return true
  }

  async scanTcp(file, envelope) {
    if (!this.found.tcp) throw new Error('TCP listener not found')
    return this.scanVia(this.cfg.net, file, envelope)
  }

  async scanSocket(file, envelope) {
    if (!file) throw new Error('file is required!')
    if (!this.found.socket) throw new Error('unix socket not found')
    return this.scanVia(this.found.socket, file, envelope)
  }

  scanVia(connectOpts, file, envelope) {
    return new Promise((resolve, reject) => {
      const socket = this.getSocket(resolve, reject)

      socket.connect(connectOpts, () => {
        socket.write(this.requestPreamble(envelope), () => {
          fs.createReadStream(file)
            .pipe(socket)
            .on('error', (err) => {
              logger.error(err)
            })
        })
      })
    })
  }

  getSocket(resolve, reject) {
    const socket = new net.Socket()
    let allData = ''

    socket.setTimeout(this.cfg.timeout * 1000)
    socket
      .on('end', () => {
        resolve(this.parseScanReply(allData))
      })
      .on('data', (data) => {
        allData += data
      })
      .on('error', (err) => {
        logger.error(err)
        reject(err)
      })

    return socket
  }
}

module.exports = {
  createScanner: (name) => {
    return new Scanner(name)
  },
}
