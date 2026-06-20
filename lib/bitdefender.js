import child from 'node:child_process'
import path from 'node:path'
import util from 'node:util'

import * as logger from './logger.js'
import BaseScanner from './base-scanner.js'

const execAsync = util.promisify(child.exec)

class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'bitdefender'

    this.init()

    if (!this.cfg.cli.bin) this.cfg.cli.bin = 'bdscan'
    if (!this.cfg.cli.args) this.cfg.cli.args = '--no-list'

    this.failFile = path.resolve('test/files/eicar.eml')
    this.passFile = path.resolve('test/files/clean.eml')

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

  async scanBin(file) {
    const cmd = this.binCmd(file)
    logger.debug(cmd)

    let stdout, stderr
    try {
      ;({ stdout, stderr } = await execAsync(cmd))
    } catch (error) {
      // bdscan exits 1 when a virus is found — not a real error
      if (error.code !== 1) {
        logger.error(error)
        throw error
      }
      ;({ stdout, stderr } = error)
    }

    if (stderr) {
      logger.error('stderr')
      throw new Error(stderr)
    }
    if (!stdout) throw new Error('no stdout?')

    return this.parseScanReply(stdout)
  }

  parseScanReply(response) {
    const result = {
      pass: [],
      fail: [],
      name: this.name,
      raw: response,
      error: [],
    }

    logger.info(response)
    let r = response.match(/Infected files: ([\d]+)\s/)
    if (r[1] === '0') {
      result.pass.push('clean')
      return result
    }

    r = response.match(/infected: ([^\n\n]+)/)
    result.fail.push(r[1])

    return result
  }
}

export function createScanner(name) {
  return new Scanner(name)
}
