'use strict';

const assert = require('node:assert/strict');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const dspam = require('../lib/dspam').createScanner();

const spamMsg  = path.resolve('test/files/gtube.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

// dspam LMTP delivery needs smtp-connection, which is no longer a dependency
describe.skip('dspam', () => {

    describe('dspam cli', () => {
        let avail;
        before(async () => { avail = await dspam.binFound().catch(() => false); });

        it('detects spam message', async (t) => {
            if (!avail) return t.skip();
            await dspam.scanBin(spamMsg);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await dspam.scanBin(cleanMsg);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await dspam.tcpListening().catch(() => false); });

        it('pings', async (t) => {
            if (!avail) return t.skip();
            assert.ok(await dspam.ping(null, dspam.cfg.net));
        });

        it.skip('detects a spam message', async () => {
            const results = await dspam.scanTcp(spamMsg);
            assert.ok(results.raw);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await dspam.scanTcp(cleanMsg);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await dspam.socketFound().catch(() => false); });

        it.skip('detects spam message', async () => {
            const results = await dspam.scanSocket(spamMsg);
            assert.equal(results.pass.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await dspam.scanSocket(cleanMsg);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('scan dispatch', () => {
        let avail;
        before(async () => { avail = await dspam.isAvailable().catch(() => false); });

        it.skip('scans spam', async () => {
            const results = await dspam.scan(spamMsg);
            assert.equal(results.fail.length, 1);
        });

        it('scans clean', async (t) => {
            if (!avail) return t.skip();
            const results = await dspam.scan(cleanMsg);
            assert.equal(results.pass.length, 1);
        });
    });
});
