'use strict'

const child = require('node:child_process')
const net = require('node:net')
const path = require('node:path')
const { promisify } = require('node:util')

const logger = require('./logger')

const execAsync = promisify(child.exec)

class Scanner {
  constructor(name) {
    this.name = name || 'all-about-that-base'

    this.init()

    this.failFile = path.resolve('test/files/gtube.eml')
    this.passFile = path.resolve('test/files/clean.eml')

    this.findBin = require('./detect-cli').findBin
    this.findTcp = require('./detect-tcp').findTcp
    this.findSocket = require('./detect-socket').findSocket
  }

  init() {
    this.initCfg()

    this.found = {
      any: false,
      cli: undefined,
      tcp: undefined,
      socket: undefined,
    }

    this.available = {
      any: false,
      cli: false,
      tcp: false,
      socket: false,
    }
  }

  initCfg() {
    this.config = require('./config').loadConfig()
    this.cfg = this.config[this.name]

    if (!this.cfg) this.cfg = {}
    if (!this.cfg.timeout) this.cfg.timeout = 30
    if (!this.cfg.cli) this.cfg.cli = {}
    if (!this.cfg.cli.args) this.cfg.cli.args = ''
    if (!this.cfg.net) this.cfg.net = {}
  }

  async isFound() {
    try {
      if (await this.socketFound()) {
        this.found.any = 'socket'
        return this.found.any
      }
    } catch (err) {
      logger.error(err)
    }

    try {
      if (await this.binFound()) {
        this.found.any = 'cli'
        return this.found.any
      }
    } catch (err) {
      logger.error(err)
    }

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
      if (await this.socketAvailable()) {
        this.available.any = 'socket'
        return this.available.any
      }
    } catch {
      /* try the next transport */
    }

    try {
      if (await this.binAvailable()) {
        this.available.any = 'cli'
        return this.available.any
      }
    } catch {
      /* try the next transport */
    }

    try {
      if (await this.tcpAvailable()) {
        this.available.any = 'tcp'
        return this.available.any
      }
    } catch {
      /* none available */
    }

    this.available.any = false
    return this.available.any
  }

  async scan(file) {
    switch (this.available.any) {
      case 'tcp':
        return this.scanTcp(file)
      case 'socket':
        return this.scanSocket(file)
      case 'cli':
        return this.scanBin(file)
      default:
        return this.isAvailable()
    }
  }

  async binFound() {
    if (!this.cfg.cli.bin) throw new Error('no bin configured')

    const scanBin = await this.findBin(this.cfg.cli.bin)
    if (!scanBin) throw new Error(this.cfg.cli.bin + ' not found')

    this.found.cli = scanBin
    return scanBin
  }

  async binAvailable() {
    await this.binFound()

    const failResults = await this.scanBin(this.failFile)
    if (!failResults.fail || failResults.fail.length === 0) {
      logger.error(failResults)
      throw new Error('negative detection failed')
    }

    const passResults = await this.scanBin(this.passFile)
    if (passResults.pass.length === 0) {
      throw new Error('positive detection failed')
    }

    this.available.cli = true
    return true
  }

  binCmd(file) {
    if (!this.found.cli) throw new Error('cli not found')

    return this.found.cli + ' ' + this.cfg.cli.args + ' ' + file
  }

  async scanBin(file) {
    const cmd = this.binCmd(file)
    logger.debug(cmd)

    let stdout, stderr
    try {
      ;({ stdout, stderr } = await execAsync(cmd))
    } catch (err) {
      logger.error('exec error')
      throw err
    }

    if (stderr) {
      logger.error('stderr')
      throw new Error(stderr)
    }
    if (!stdout) throw new Error('no stdout?')

    return this.parseScanReply(stdout)
  }

  parseScanReply(_response) {
    return 'parseScanReply must be overloaded'
  }

  async tcpListening() {
    if (!this.cfg.net) throw new Error('no network config')

    const listening = await this.findTcp(this.cfg.net)
    this.found.tcp = listening
    return listening
  }

  async tcpAvailable() {
    await this.tcpListening()

    const socket = new net.Socket()
    socket.setTimeout(5 * 1000)

    const pings = await this.ping(socket, this.cfg.net)
    this.available.tcp = pings
    return pings
  }

  async scanTcp(_file) {
    throw new Error('scanTCP must be overloaded')
  }

  async ping(_socket, _connOpts) {
    throw new Error('ping must be overloaded')
  }

  async socketFound() {
    const sockFile = this.cfg.socket
    if (!sockFile) throw new Error('no socket file')

    const sockPath = await this.findSocket(sockFile)
    if (!sockPath) throw new Error(`${sockFile} not found`)

    this.found.socket = { path: sockPath }
    return this.found.socket
  }

  async socketAvailable() {
    await this.socketFound()

    const socket = new net.Socket()
    socket.setTimeout(5 * 1000)

    const pings = await this.ping(socket, this.found.socket)
    this.available.socket = pings
    return pings
  }

  async scanSocket(_file) {
    throw new Error('scanSocket must be overloaded')
  }
}

module.exports = Scanner
