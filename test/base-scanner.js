import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import BaseScanner from '../lib/base-scanner.js'
const base = new BaseScanner('base-test')

describe('base-scanner', () => {
  it('exports a function', () => {
    assert.equal(typeof BaseScanner, 'function')
  })

  it('has an init function', () => {
    assert.equal(typeof base.init, 'function')
  })

  it('contains standard properties', () => {
    assert.equal(typeof base.found, 'object')
    assert.equal(typeof base.available, 'object')
  })

  const groups = {
    'has detect functions': ['findBin', 'findTcp', 'findSocket'],
    'has high-level scanning functions': ['isFound', 'isAvailable', 'scan'],
    'has bin scanning functions': ['binFound', 'binAvailable', 'scanBin'],
    'has TCP scanning functions': ['tcpListening', 'tcpAvailable', 'scanTcp'],
    'has Socket scanning functions': [
      'socketFound',
      'socketAvailable',
      'scanSocket',
    ],
  }

  for (const [group, fns] of Object.entries(groups)) {
    describe(group, () => {
      for (const fn of fns) {
        it(fn, () => assert.equal(typeof base[fn], 'function'))
      }
    })
  }
})
