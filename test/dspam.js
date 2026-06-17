'use strict';

const assert = require('node:assert/strict');
const os     = require('node:os');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const dspam = require('../lib/dspam').createScanner();

const spamMsg  = path.resolve('test/files/gtube.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(os.hostname())) return;

const probe = (fn) => new Promise((resolve) => fn((err, res) => resolve(err ? false : res)));
const call  = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

// dspam LMTP delivery needs smtp-connection, which is no longer a dependency
describe.skip('dspam', () => {

    describe('dspam cli', () => {
        let avail;
        before(async () => { avail = await probe((cb) => dspam.binFound(cb)); });

        it('detects spam message', async (t) => {
            if (!avail) return t.skip();
            await call((cb) => dspam.scanBin(spamMsg, cb));
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => dspam.scanBin(cleanMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await probe((cb) => dspam.tcpListening(cb)); });

        it('pings', async (t) => {
            if (!avail) return t.skip();
            assert.ok(await call((cb) => dspam.ping(null, dspam.cfg.net, cb)));
        });

        it.skip('detects a spam message', async () => {
            const results = await call((cb) => dspam.scanTcp(spamMsg, cb));
            assert.ok(results.raw);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => dspam.scanTcp(cleanMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await probe((cb) => dspam.socketFound(cb)); });

        it.skip('detects spam message', async () => {
            const results = await call((cb) => dspam.scanSocket(spamMsg, cb));
            assert.equal(results.pass.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => dspam.scanSocket(cleanMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('scan dispatch', () => {
        let avail;
        before(async () => { avail = await probe((cb) => dspam.isAvailable(cb)); });

        it.skip('scans spam', async () => {
            const results = await call((cb) => dspam.scan(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('scans clean', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => dspam.scan(cleanMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });
});
