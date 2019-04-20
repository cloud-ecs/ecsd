'use strict';

const assert = require('assert');
const path   = require('path');

const clamav = require('../lib/clamav').createScanner();

const virusMsg = path.resolve('test/files/eicar.eml');
const cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(require('os').hostname())) return;
console.log(require('os').hostname());

describe('clamav', function () {

    describe('clamdscan', function () {

        before(function (done) {
            clamav.binAvailable((err, bin) => {
                if (err) console.error(err.message)
                if (!bin) this.skip()
                done()
            })
        })

        it('detects eicar virus', function (done) {
            clamav.scanBin(virusMsg, (err, results) => {
                assert.ifError(err)
                // console.log(results)
                assert.ok(results.fail.length)
                assert.equal(results.fail[0], 'Eicar-Test-Signature')
                done()
            })
        })

        it('passes a clean message', function (done) {
            clamav.scanBin(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 0)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('TCP', function () {

        before(function (done) {
            clamav.tcpListening((err, listening) => {
                if (err) console.error(err.message)
                if (!listening) this.skip()
                done()
            })
        })

        it('detects a virus laden message', function (done) {
            clamav.scanTcp(virusMsg, (err, results) => {
                assert.ifError(err)
                assert.ok(results.fail.length)
                assert.equal(results.fail[0], 'Eicar-Test-Signature')
                done()
            })
        })

        it('passes a clean message', function (done) {
            clamav.scanTcp(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 0)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('unix socket', function () {

        before(function (done) {
            clamav.socketFound((err, listening) => {
                if (err) console.error(err.message)
                if (!listening) this.skip()
                done()
            })
        })

        it('detects virus in message', function (done) {
            clamav.scanSocket(virusMsg, (err, results) => {
                assert.ifError(err)
                assert.ok(results.fail.length)
                assert.equal(results.fail[0], 'Eicar-Test-Signature')
                done()
            })
        })

        it('passes a clean message', function (done) {
            clamav.scanSocket(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 0)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })

    describe('scan dispatch', function () {

        before(function (done) {
            clamav.isAvailable((err, available) => {
                if (err) console.error(err.message)
                if (!available) this.skip()
                done()
            })
        })

        it('scans viruses', function (done) {
            clamav.scan(virusMsg, (err, results) => {
                assert.ifError(err)
                assert.ok(results.fail.length)
                assert.equal(results.fail[0], 'Eicar-Test-Signature')
                done()
            })
        })

        it('scans clean', function (done) {
            clamav.scan(cleanMsg, (err, results) => {
                assert.ifError(err)
                assert.equal(results.fail.length, 0)
                assert.equal(results.pass.length, 1)
                done()
            })
        })
    })
})
