'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')

const defaultSocketDirs = [
  '/tmp', // Mac OS X (macports)
  '/var/run', // FreeBSD ports
]

exports.findSocket = async function (fileName, dirs) {
  if (!fileName) throw new Error('missing "fileName" argument')
  if (!dirs || dirs.length === 0) dirs = defaultSocketDirs

  for (const dir of dirs) {
    const candidate = path.resolve(dir, fileName)
    if (await isSocket(candidate)) return candidate
  }
}

async function isSocket(filePath) {
  try {
    const stats = await fs.stat(filePath)
    return stats.isSocket()
  } catch {
    return false
  }
}
