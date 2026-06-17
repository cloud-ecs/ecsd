'use strict';

const assert = require('node:assert/strict');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const clamav = require('../lib/clamav').createScanner();

const virusMsg = path.resolve('test/files/eicar.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

describe('clamav', () => {

    describe('clamdscan', () => {
        let avail;
        before(async () => { avail = await clamav.binAvailable().catch(() => false); });

        it('detects eicar virus', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanBin(virusMsg);
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanBin(cleanMsg);
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await clamav.tcpListening().catch(() => false); });

        it('detects a virus laden message', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanTcp(virusMsg);
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanTcp(cleanMsg);
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await clamav.socketFound().catch(() => false); });

        it('detects virus in message', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanSocket(virusMsg);
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scanSocket(cleanMsg);
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });

    describe('scan dispatch', () => {
        let avail;
        before(async () => { avail = await clamav.isAvailable().catch(() => false); });

        it('scans viruses', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scan(virusMsg);
            assert.ok(results.fail.length);
            assert.equal(results.fail[0], 'Eicar-Test-Signature');
        });

        it('scans clean', async (t) => {
            if (!avail) return t.skip();
            const results = await clamav.scan(cleanMsg);
            assert.equal(results.fail.length, 0);
            assert.equal(results.pass.length, 1);
        });
    });
});
