'use strict';

const assert = require('assert');
const path   = require('path');

const spam  = require('../lib/spamassassin').createScanner();

const spamMsg = path.resolve('test/files/gtube.eml');
const hamMsg  = path.resolve('test/files/clean.eml');

const isTravis = /worker|testing/.test(require('os').hostname());
if (process.env.NODE_ENV !== 'cov' && isTravis) return;

describe('spamassassin', function () {

    describe('spamc cli', function () {

        before(function (done) {
            spam.binFound((err, bin) => {
                if (err) console.error(`\t${err.message}`)
                if (!bin) this.skip()
                done()
            })
        })

        it('finds gtube spam message', function (done) {
            spam.scanBin(spamMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            spam.scanBin(hamMsg, (err, results) => {
                assert.ifError(err)
                // console.log(results);
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('TCP', function () {

        before(function (done) {
            spam.tcpListening((err, listening) => {
                if (err) console.error(`\t${err.message}`)
                if (!listening) this.skip()
                done()
            })
        })

        it('pings', function (done) {
            spam.tcpAvailable((err, avail) => {
                assert.ifError(err)
                assert.ok(avail)
                done()
            })
        })

        it('detects a spam message', function (done) {
            spam.scanTcp(spamMsg, (err, results) => {
                assert.ifError(err)
                if (!results.fail.length) console.error(results)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            spam.scanTcp(hamMsg, (err, results) => {
                // console.log(result);
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('unix socket', function () {

        before(function (done) {
            spam.socketFound((err, listening) => {
                if (err) console.error(`\t${err.message}`)
                if (!listening) this.skip()
                done()
            })
        })

        it('detects spam message', function (done) {
            spam.scanSocket(spamMsg, (err, results) => {
                assert.ifError(err)
                // console.log(result);
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            spam.scanSocket(hamMsg, (err, results) => {
                // console.log(result);
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('scan dispatch', function () {

        before(function (done) {
            spam.isAvailable((err, available) => {
                if (err) console.error(`\t${err.message}`)
                if (!available) this.skip()
                done()
            })
        })

        it('scans spam', function (done) {
            spam.scan(spamMsg, (err, results) => {
                assert.ifError(err)
                if (!results.fail.length) console.error(results)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('scans clean', function (done) {
            spam.scan(hamMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })

        it('scans spam concurrently', function (done) {
            spam.scan(spamMsg, (err, results) => {
                assert.ifError(err)
                if (!results.fail.length) console.error(results)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('scans clean concurrently', function (done) {
            spam.scan(hamMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })
})