import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import * as logger from './logger.js'
import * as envelope from './envelope.js'
import { loadConfig } from './config.js'

const cfg = loadConfig()
const spoolDir = path.resolve(cfg.spool.dir)
fs.mkdirSync(spoolDir, { recursive: true })

export const scanners = [
  'spamassassin',
  'rspamd',
  'dcc',
  'virustotal',
  'clamav',
  'opendkim',
  'maildmarc',
  // 'opendmarc',
  // 'dspam',
  // 'messagesniffer',
  // 'fprot',
  // 'f-secure',
  // 'avg',
  // 'eset',
  // 'kaspersky',
  // 'comodo',
  // 'bitdefender',
]

export const availableScanners = {}

export async function testScanner(s) {
  let scanner
  try {
    scanner = (await import(`./${s}.js`)).createScanner()
  } catch {
    logger.error(`could not load: ${s}`)
    return
  }

  try {
    if (await scanner.isAvailable()) {
      availableScanners[s] = scanner
    } else {
      logger.error(`not available: ${s}`)
    }
  } catch {
    /* availability probe failed; leave scanner out */
  }
}

// The request body is the raw message to scan (curl --data-binary @msg.eml);
// SMTP envelope and auth metadata arrive as X-Env-* headers (see lib/envelope).
export function post(req, res) {
  const meta = envelope.fromRequest(req)
  const file = path.join(
    spoolDir,
    `${crypto.randomBytes(16).toString('hex')}.eml`,
  )
  const spool = fs.createWriteStream(file)

  spool.on('error', async (err) => {
    logger.error(err)
    await unlinkSpool(file)
    res.status(500).json({ err: 'could not spool message' })
  })

  spool.on('finish', async () => {
    if (spool.bytesWritten === 0) {
      await unlinkSpool(file)
      res.status(400).json({ err: 'empty request body' })
      return
    }

    const scanners = Object.values(availableScanners)
    try {
      const results = await Promise.all(
        scanners.map((scanner) => scanOne(scanner, file, meta)),
      )
      res.json(results)
    } catch (e) {
      logger.error(e)
      res.json({ err: e.message })
    } finally {
      await unlinkSpool(file)
    }
  })

  req.pipe(spool)
}

async function unlinkSpool(file) {
  try {
    await fs.promises.unlink(file)
  } catch (e) {
    logger.error(e)
  }
}

async function scanOne(scanner, file, meta) {
  try {
    return await scanner.scan(file, meta)
  } catch (e) {
    logger.error(e)
    return null
  }
}

export function get(req, res) {
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(
    `<form id="scan">
  <input type="file" id="upload" required>
  <button type="submit">Scan</button>
</form>
<pre id="results"></pre>
<script>
  document.getElementById('scan').addEventListener('submit', async (e) => {
    e.preventDefault()
    const file = document.getElementById('upload').files[0]
    if (!file) return
    const res = await fetch('/scan', { method: 'POST', body: file })
    document.getElementById('results').textContent = JSON.stringify(
      await res.json(),
      null,
      2,
    )
  })
</script>`,
  )
}

export function listAll(req, res) {
  res.json({ scanners })
}

export function listAvailable(req, res) {
  res.json({ scanners: availableScanners })
}

for (const s of scanners) testScanner(s)

// re-test scanner availability every 2 minutes; unref so it never keeps a
// short-lived process (e.g. the test runner) alive on its own
setInterval(() => {
  for (const s of scanners) testScanner(s)
}, 120 * 1000).unref()
