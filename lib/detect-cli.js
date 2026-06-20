import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

const defaultBinDirs = [
  '/bin',
  '/sbin',
  '/usr/bin',
  '/usr/sbin',
  '/usr/local/bin',
  '/usr/local/sbin',
  '/opt/local/bin',
  '/opt/local/sbin',
]

export async function findBin(bin, dirs) {
  if (!bin) throw new Error('missing "bin" argument')
  if (!dirs || dirs.length === 0) dirs = defaultBinDirs

  for (const dir of dirs) {
    const candidate = path.resolve(dir, bin)
    if (await isExecutable(candidate)) return candidate
  }
}

async function isExecutable(filePath) {
  try {
    await fs.access(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}
