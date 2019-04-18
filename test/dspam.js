'use strict';

const assert = require('assert');
const path   = require('path');

const dspam  = require('../lib/dspam').createScanner();

const spamMsg  = path.resolve('test/files/gtube.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(require('os').hostname())) return;
console.log(require('os').hostname());

before(function (done) {
    dspam.isFound(function (err, found) {
        done(err)
    })
})

describe.skip('dspam', function () {

    describe('dspam cli', function () {

        before(function (done) {
            dspam.binFound(function (err, bin) {
                done(err)
            })
        })

        it.skip('detects spam message', function (done) {
            dspam.scanBin(spamMsg, (err, results) => {
                assert.ifError(err)
                // console.log(results);
                // naive bayes...
                // assert.equal(results.fail.length, 1);
                done()
            })
        })

        it('passes a clean message', function (done) {
            dspam.scanBin(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('TCP', function () {

        before(function (done) {
            dspam.tcpListening((err, listening) => {
                done(err)
            })
        })

        it('pings', function (done) {
            dspam.ping(null, dspam.cfg.net, (err, result) => {
                assert.ifError(err)
                assert.ok(result)
                done()
            })
        })

        it.skip('detects a spam message', function (done) {
            dspam.scanTcp(spamMsg, (err, results) => {
                assert.ifError(err)
                // console.log(result);
                // silly naive bayes..., doesn't know any better...yet
                // assert.equal(results.fail.length, 1);
                assert.ok(results.raw)
                done()
            })
        })

        it('passes a clean message', function (done) {
            dspam.scanTcp(cleanMsg, (err, results) => {
                // console.log(results)
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe.skip('unix socket', function () {

        before(function (done) {
            dspam.socketFound((err, listening) => {
                done(err)
            })
        })

        it.skip('detects spam message', function (done) {
            dspam.scanSocket(spamMsg, (err, results) => {
                assert.ifError(err)
                // console.log(result)
                // dspam is naive when untrained, so it won't catch this
                assert.equal(results.pass.length, 1)
                done()
            })
        })

        it('passes a clean message', function (done) {
            dspam.scanSocket(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('scan dispatch', function () {

        before(function (done) {
            dspam.isAvailable(function (err, available) {
                if (err) return done(err)
                if (!available) return done(new Error('dspam not available'))
                done()
            })
        })

        it.skip('scans spam', function (done) {
            dspam.scan(spamMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 1)
                done()
            })
        })

        it('scans clean', function (done) {
            dspam.scan(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })
})
