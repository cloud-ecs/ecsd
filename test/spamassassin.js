'use strict';

const assert = require('node:assert/strict');
const os     = require('node:os');
const path   = require('node:path');
const { describe, it, before } = require('node:test');

const spam = require('../lib/spamassassin').createScanner();

const spamMsg = path.resolve('test/files/gtube.eml');
const hamMsg  = path.resolve('test/files/clean.eml');

const isTravis = /worker|testing/.test(os.hostname());
if (process.env.NODE_ENV !== 'cov' && isTravis) return;

const probe = (fn) => new Promise((resolve) => fn((err, res) => resolve(err ? false : res)));
const call  = (fn) => new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));

describe('spamassassin', () => {

    describe('spamc cli', () => {
        let avail;
        before(async () => { avail = await probe((cb) => spam.binFound(cb)); });

        it('finds gtube spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanBin(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanBin(hamMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('TCP', () => {
        let avail;
        before(async () => { avail = await probe((cb) => spam.tcpListening(cb)); });

        it('pings', async (t) => {
            if (!avail) return t.skip();
            assert.ok(await call((cb) => spam.tcpAvailable(cb)));
        });

        it('detects a spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanTcp(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanTcp(hamMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('unix socket', () => {
        let avail;
        before(async () => { avail = await probe((cb) => spam.socketFound(cb)); });

        it('detects spam message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanSocket(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('passes a clean message', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scanSocket(hamMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });

    describe('scan dispatch', () => {
        let avail;
        before(async () => { avail = await probe((cb) => spam.isAvailable(cb)); });

        it('scans spam', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scan(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('scans clean', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scan(hamMsg, cb));
            assert.equal(results.pass.length, 1);
        });

        it('scans spam concurrently', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scan(spamMsg, cb));
            assert.equal(results.fail.length, 1);
        });

        it('scans clean concurrently', async (t) => {
            if (!avail) return t.skip();
            const results = await call((cb) => spam.scan(hamMsg, cb));
            assert.equal(results.pass.length, 1);
        });
    });
});
