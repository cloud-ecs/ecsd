'use strict';

process.env.NODE_ENV = 'test';

const assert = require('node:assert/strict');
const os     = require('node:os');
const { describe, it, before } = require('node:test');

const rspamd = require('../lib/rspamd').createScanner();
const isTravis = /worker/.test(os.hostname());
if (process.env.NODE_ENV !== 'cov' && isTravis) return;

const probe = (fn) => new Promise((resolve) => fn((err, res) => resolve(err ? false : res)));
const call  = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

describe('rspamd', () => {

    describe('rspamc cli', () => {
        let avail;
        before(async () => { avail = await probe((cb) => rspamd.binFound(cb)); });

        it('finds gtube spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanBin(rspamd.failFile, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanBin(rspamd.passFile, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await probe((cb) => rspamd.tcpListening(cb)); });

        it('pings', async (t) => {
            if (!avail) return t.skip();
            assert.ok(await call((cb) => rspamd.tcpAvailable(cb)));
        });

        it('detects a spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanTcp(rspamd.failFile, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', { timeout: 7000 }, async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanTcp(rspamd.passFile, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await probe((cb) => rspamd.socketFound(cb)); });

        it('detects spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanSocket(rspamd.failFile, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scanSocket(rspamd.passFile, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe.skip('scan dispatch', () => {
        let avail;
        before(async () => { avail = await probe((cb) => rspamd.isAvailable(cb)); });

        it('scans spam', { timeout: 4000 }, async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scan(rspamd.failFile, cb));
            assert.equal(results.fail.length, 1);
        });

        it('scans clean', { timeout: 4000 }, async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => rspamd.scan(rspamd.passFile, cb));
            assert.equal(results.pass.length, 1);
        });
    });
});
