import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'

import BaseScanner from './base-scanner.js'

// EICAR's sha256 is always present in VirusTotal, so a lookup of it doubles as
// a cheap auth/liveness probe that never uploads anything.
export const EICAR_SHA256 =
  '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f'

// https://docs.virustotal.com/reference/overview
class Scanner extends BaseScanner {
  constructor(name) {
    super()

    this.name = name || 'virustotal'

    this.init()

    if (!this.cfg.apikey) this.cfg.apikey = process.env.VIRUSTOTAL_API_KEY
    if (!this.cfg.baseUrl)
      this.cfg.baseUrl = 'https://www.virustotal.com/api/v3'

    this.failFile = path.resolve('test/files/eicar.eml')
    this.passFile = path.resolve('test/files/clean.eml')
  }

  async isAvailable() {
    this.available.any = false
    if (!this.cfg.apikey) return false

    try {
      const res = await this.request({
        method: 'GET',
        path: `/files/${EICAR_SHA256}`,
      })
      if (res.status !== 401) this.available.any = 'network'
    } catch {
      /* network/auth probe failed; leave unavailable */
    }

    return this.available.any
  }

  async scan(file) {
    const hash = await this.sha256(file)

    // Reuse VirusTotal's existing verdict when it has already seen this file;
    // only upload (publishing the content to a third party) when it hasn't.
    let report = await this.lookup(hash)
    if (!report) {
      const analysisId = await this.upload(file)
      report = await this.pollAnalysis(analysisId)
    }

    return this.parseScanReply(report)
  }

  parseScanReply(report) {
    const result = {
      pass: [],
      fail: [],
      name: this.name,
      raw: report,
      error: [],
    }

    const attrs = report && report.data && report.data.attributes
    const stats = attrs && (attrs.last_analysis_stats || attrs.stats)
    if (!stats) {
      result.error.push('no analysis stats in response')
      return result
    }

    const flagged = (stats.malicious || 0) + (stats.suspicious || 0)
    if (flagged > 0) {
      result.fail.push(flagged)
    } else {
      result.pass.push(stats.harmless + stats.undetected || 0)
    }

    return result
  }

  async lookup(hash) {
    const res = await this.request({ method: 'GET', path: `/files/${hash}` })
    if (res.status === 200) return res.json
    if (res.status === 404) return null
    if (res.status === 401)
      throw new Error('virustotal: unauthorized (check apikey)')
    throw new Error(`virustotal: lookup returned HTTP ${res.status}`)
  }

  async upload(file) {
    const boundary = '----ecsd' + crypto.randomBytes(16).toString('hex')
    const content = await fs.promises.readFile(file)
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${path.basename(file)}"\r\n` +
        'Content-Type: application/octet-stream\r\n\r\n',
    )
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([head, content, tail])

    const res = await this.request({
      method: 'POST',
      path: '/files',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': body.length,
      },
      body,
    })
    if (res.status !== 200)
      throw new Error(`virustotal: upload returned HTTP ${res.status}`)

    return res.json.data.id
  }

  async pollAnalysis(id) {
    const deadline = Date.now() + this.cfg.timeout * 1000

    for (;;) {
      const res = await this.request({ method: 'GET', path: `/analyses/${id}` })
      if (res.status !== 200) {
        throw new Error(`virustotal: analysis returned HTTP ${res.status}`)
      }
      if (res.json.data.attributes.status === 'completed') return res.json
      if (Date.now() > deadline)
        throw new Error('virustotal: analysis timed out')

      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  request({ method, path: reqPath, headers = {}, body }) {
    const url = new URL(this.cfg.baseUrl + reqPath)

    const opts = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'x-apikey': this.cfg.apikey, ...headers },
    }

    return new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let json = null
          try {
            json = data ? JSON.parse(data) : null
          } catch {
            /* non-JSON body (e.g. an error page); leave json null */
          }
          resolve({ status: res.statusCode, json, raw: data })
        })
      })

      req.setTimeout(this.cfg.timeout * 1000, () =>
        req.destroy(new Error('request timed out')),
      )
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }

  sha256(file) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      fs.createReadStream(file)
        .on('error', reject)
        .on('data', (chunk) => hash.update(chunk))
        .on('end', () => resolve(hash.digest('hex')))
    })
  }
}

export function createScanner(name) {
  return new Scanner(name)
}
