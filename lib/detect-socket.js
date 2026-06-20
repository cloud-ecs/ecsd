import fs from 'node:fs/promises'
import path from 'node:path'

const defaultSocketDirs = [
  '/tmp', // Mac OS X (macports)
  '/var/run', // FreeBSD ports
]

export async function findSocket(fileName, dirs) {
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
