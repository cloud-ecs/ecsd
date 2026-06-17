'use strict';

const assert = require('node:assert/strict');
const os     = require('node:os');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const clamav = require('../lib/clamav').createScanner();

const virusMsg = path.resolve('test/files/eicar.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(os.hostname())) return;

const probe = (fn) => new Promise((resolve) => fn((err, res) => resolve(err ? false : res)));
const call  = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

describe('clamav', () => {

    describe('clamdscan', () => {
        let avail;
        before(async () => { avail = await probe((cb) => clamav.binAvailable(cb)); });

        it('detects eicar virus', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanBin(virusMsg, cb));
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanBin(cleanMsg, cb));
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await probe((cb) => clamav.tcpListening(cb)); });

        it('detects a virus laden message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanTcp(virusMsg, cb));
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanTcp(cleanMsg, cb));
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await probe((cb) => clamav.socketFound(cb)); });

        it('detects virus in message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanSocket(virusMsg, cb));
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scanSocket(cleanMsg, cb));
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('scan dispatch', () => {
        let avail;
        before(async () => { avail = await probe((cb) => clamav.isAvailable(cb)); });

        it('scans viruses', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scan(virusMsg, cb));
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('scans clean', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => clamav.scan(cleanMsg, cb));
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });
});
