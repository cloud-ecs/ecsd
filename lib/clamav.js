'use strict'

const child = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { promisify } = require('node:util')

const logger = require('./logger')
const BaseScanner = require('./base-scanner')
const clamStream = require('./clamav-stream')

const execAsync = promisify(child.exec)

class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'clamav'

    this.init()

    if (!this.cfg.socket) this.cfg.socket = 'clamd.socket'
    if (!this.cfg.cli.bin) this.cfg.cli.bin = 'clamdscan'
    if (!this.cfg.cli.args) this.cfg.cli.args = ''
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
    if (!this.cfg.net.port) this.cfg.net.port = '3310'

    this.failFile = path.resolve('test/files/eicar.eml')
    this.passFile = path.resolve('test/files/clean.eml')
  }

  async scanBin(file) {
    if (!this.found.cli) {
      throw new Error('cli not found, did you run binFound yet?')
    }

    const cmd = `${this.found.cli} ${file}`

    let stdout, stderr
    try {
      ;({ stdout, stderr } = await execAsync(cmd))
    } catch (error) {
      // clamdscan exits 1 when a virus is found — not a real error; the
      // scan output is still on stdout
      if (error.code !== 1) logger.error(error)
      ;({ stdout, stderr } = error)
    }

    if (stderr) {
      logger.error('stderr: ' + stderr)
      throw new Error(stderr)
    }
    if (!stdout) throw new Error('no stdout?')

    return this.parseScanReply(stdout)
  }

  parseScanReply(response) {
    const result = {
      pass: [],
      fail: [],
      error: [],
      name: this.name,
      raw: response,
    }

    // Example responses from clamdscan & clamd
    // /tmp/clean.eml: OK
    // /tmp/eicar.eml: Eicar-Test-Signature FOUND
    // stream: Eicar-Test-Signature FOUND

    const lineOne = response.split(/[\r\n]/).shift()

    if (/OK[\0|\n]?$/.test(lineOne)) {
      result.pass.push('OK')
      return result
    }

    if (/FOUND[\0|\n]?$/.test(lineOne)) {
      const parts = lineOne.split(/:\s/)
      result.fail.push(parts[1].split(/\s/).shift())
      return result
    }

    if (/ERROR/.test(response)) {
      result.error.push(response)
    }

    return result
  }

  scanTcp(file) {
    if (!this.found.tcp) {
      return Promise.reject(new Error('TCP listener not found'))
    }

    return new Promise((resolve, reject) => {
      const socket = this.getClamSocket(resolve, reject)

      socket.connect(this.cfg.net, () => {
        socket.write('zINSTREAM\0', () => {
          fs.createReadStream(file)
            .pipe(new clamStream())
            .pipe(socket)
            .on('error', (err) => {
              logger.error(err)
            })
        })
      })
    })
  }

  scanSocket(file) {
    if (!file) return Promise.reject(new Error('file is required!'))
    if (!this.found.socket) {
      return Promise.reject(new Error('TCP listener not found'))
    }

    return new Promise((resolve, reject) => {
      const socket = this.getClamSocket(resolve, reject)

      socket.connect(this.found.socket, () => {
        if (typeof file === 'string' && file[0] !== '/') {
          file = path.resolve(file)
        }
        socket.write(`SCAN ${file}`)
      })
    })
  }

  getClamSocket(resolve, reject) {
    const socket = new net.Socket()

    socket.setTimeout(this.cfg.timeout * 1000)
    socket
      .on('data', (data) => {
        socket.end()
        resolve(this.parseScanReply(data.toString()))
      })
      .on('close', (err) => {
        if (err) {
          logger.error('on.close')
          logger.error('transmision errors encountered')
        }
      })
      .on('error', (err) => {
        logger.error('error')
        reject(err)
      })

    return socket
  }

  async install() {
    switch (process.platform) {
      case 'darwin':
        return this.installMacOSX()
      case 'freebsd':
        return this.installFreeBSD()
      case 'linux':
        return this.installLinux()
      default:
        throw new Error(`install not supported on ${process.platform}`)
    }
  }

  async installMacOSX() {
    // sudo port install clamav clamav-servers
    // sudo launchctl load -w /Library/LaunchDaemons/org.macports.freshclam.plist
    // sudo launchctl load -w /Library/LaunchDaemons/org.macports.clamd.plist
  }

  async installFreeBSD() {
    // sudo pkg install -y clamav
    // echo 'clamav_freshclam_enable="YES"' | sudo tee -a /etc/rc.conf -
    // echo 'clamav_clamd_enable="YES"' | sudo tee -a /etc/rc.conf -
    // sudo service clamav-freshclam start
    // sudo service clamav-clamd start
  }

  async installLinux() {
    // sudo apt-get install -y clamav-daemon clamav-freshclam libclamunrar6
  }

  ping(socket, connOpts) {
    return new Promise((resolve, reject) => {
      let pingErr

      socket
        .connect(connOpts, () => {
          socket.write('nPING\n')
        })
        .on('end', () => {
          if (pingErr) return reject(pingErr)
          resolve(true)
        })
        .on('data', (data) => {
          if (data.toString() === 'PONG\n') {
            return socket.end()
          }
          pingErr = new Error('unexpected: ' + data.toString())
          socket.end()
        })
        .on('close', (err) => {
          if (err) {
            logger.error('on.close')
            logger.error('transmision errors encountered')
          }
        })
        .on('error', (err) => {
          logger.error('error')
          reject(err)
        })
    })
  }
}

module.exports = {
  createScanner: (name) => {
    return new Scanner(name)
  },
}
