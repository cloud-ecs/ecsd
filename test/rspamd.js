'use strict';

var assert = require('assert');

var rspamd = require('../lib/rspamd').createScanner();
var isTravis = /worker/.test(require('os').hostname());
if (process.env.NODE_ENV !== 'cov' && isTravis) return;

describe('rspamd', function() {

    describe('rspamc cli', function () {

        before(function (done) {
            rspamd.binFound((err, bin) => {
                if (err) console.error(err.message)
                if (!bin) this.skip()
                done(err)
            })
        })

        it('finds gtube spam message', function (done) {
            rspamd.scanBin(rspamd.failFile, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            rspamd.scanBin(rspamd.passFile, (err, results) => {
                assert.ifError(err)
                // console.log(results);
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('TCP', function () {

        before(function (done) {
            rspamd.tcpListening((err, listening) => {
                if (err) console.error(err.message)
                if (!listening) this.skip()
                done()
            })
        })

        it('pings', function (done) {
            rspamd.tcpAvailable((err, avail) => {
                assert.ifError(err)
                assert.ok(avail)
                done()
            })
        })

        it('detects a spam message', function (done) {
            rspamd.scanTcp(rspamd.failFile, (err, results) => {
                assert.ifError(err)
                // console.log(results);
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        this.timeout(7000);
        it('passes a clean message', function (done) {
            rspamd.scanTcp(rspamd.passFile, (err, results) => {
                // console.log(result);
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('unix socket', function () {

        before(function (done) {
            rspamd.socketFound((err, listening) => {
                if (err) console.error(err.message)
                if (!listening) this.skip()
                done()
            })
        })

        it('detects spam message', function (done) {
            rspamd.scanSocket(rspamd.failFile, (err, results) => {
                assert.ifError(err)
                // console.log(result);
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            rspamd.scanSocket(rspamd.passFile, (err, results) => {
                // console.log(result);
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe.skip('scan dispatch', function () {

        before(function (done) {
            rspamd.isAvailable((err, available) => {
                if (err) console.error(err.message)
                if (!available) this.skip()
                done()
            })
        })

        it('scans spam', function (done) {
            rspamd.scan(rspamd.failFile, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('scans clean', function (done) {
            rspamd.scan(rspamd.passFile, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })
})
