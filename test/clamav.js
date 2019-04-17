'use strict';

var assert = require('assert');
var path   = require('path');

var clamav = require('../lib/clamav').createScanner();

var virusMsg = path.resolve('test/files/eicar.eml');
var cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(require('os').hostname())) return;
console.log(require('os').hostname());

before(function (done) {
    clamav.isFound((err, found) => {
        done(err)
    })
})

describe('clamav', function () {

    describe('clamdscan', function () {

        before(function (done) {
            clamav.binAvailable((err, bin) => {
                done(err)
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
                if (err) return done(err)
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
                done(err)
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
            clamav.isAvailable(function (err, available) {
                if (err) return done(err)
                if (!available) return done(new Error('clamav not available'))
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

