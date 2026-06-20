import path from 'node:path'
import util from 'node:util'

import * as logger from './logger.js'
import BaseScanner from './base-scanner.js'

class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'opendkim'

    this.init()

    if (!this.cfg.cli.bin) this.cfg.cli.bin = 'opendkim'
    if (!this.cfg.cli.args) this.cfg.cli.args = '-t'

    this.failFile = path.resolve('test/files/dkim-invalid.eml')
    this.passFile = path.resolve('test/files/dkim-valid.eml')

    logger.debug(util.inspect(this, { depth: null }))
  }

  async isFound() {
    try {
      if (await this.binFound()) {
        this.found.any = 'cli'
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
      if (await this.binAvailable()) {
        this.available.any = 'cli'
        return this.available.any
      }
    } catch {
      /* not available */
    }

    this.available.any = false
    return this.available.any
  }

  async scan(file) {
    if (this.available.any === 'cli') return this.scanBin(file)
  }

  parseScanReply(response) {
    const result = {
      pass: [],
      fail: [],
      name: this.name,
      raw: response,
      error: [],
    }

    // 'opendkim: /tmp/clean.eml: message not signed\n'
    // '... verification (s=mar2013, d=tnpi.net, 2048-bit key) succeeded'
    // 'verification (s=mar2013 d=tnpi.net, 2048-bit key, insecure) failed'

    const parts = response.trim().split(/:\s/)

    if (/^verification.*succeeded$/.test(parts[2])) {
      result.pass.push(parts[2])
      return result
    }

    result.fail.push(parts[2])

    return result
  }
}

export function createScanner(name) {
  return new Scanner(name)
}
