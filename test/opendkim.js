'use strict';

const assert = require('node:assert/strict');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const opendkim = require('../lib/opendkim').createScanner();

const signedValidMsg = path.resolve('test/files/dkim-valid.eml');
const signedInvalidMsg = path.resolve('test/files/dkim-invalid.eml');
const unsignedMsg = path.resolve('test/files/clean.eml');

const probe = (fn) => new Promise((resolve) => fn((err, res) => resolve(err ? false : res)));
const call  = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

describe('opendkim', () => {
    let found;
    before(async () => { found = await probe((cb) => opendkim.binFound(cb)); });

    it('is found', (t) => {
        if (!found) return t.skip();
        assert.ok(found);
    });

    it('is available', async (t) => {
        if (!found) return t.skip();
        assert.ok(await call((cb) => opendkim.isAvailable(cb)));
    });

    it('valid signed message yields pass', async (t) => {
        if (!found) return t.skip();
        const results = await call((cb) => opendkim.scanBin(signedValidMsg, cb));
        assert.ok(results.pass.length > 0);
    });

    it('invalid signed message yields fail', async (t) => {
        if (!found) return t.skip();
        const results = await call((cb) => opendkim.scanBin(signedInvalidMsg, cb));
        assert.ok(results.fail.length > 0);
    });

    it('unsigned message yields failure', async (t) => {
        if (!found) return t.skip();
        const results = await call((cb) => opendkim.scanBin(unsignedMsg, cb));
        assert.ok(results.fail.length > 0);
    });
});
