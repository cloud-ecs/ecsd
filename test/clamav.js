'use strict';

var assert = require('assert');
var path   = require('path');

var clamav = require('../lib/clamav');

var virusMsg = path.resolve('test/files/eicar.eml');
var cleanMsg = path.resolve('test/files/clean.eml');

describe('clamav clamdscan', function () {

    it('is present', function (done) {
        clamav.binFound(function (err, bin) {
            assert.ifError(err);
            assert.ok(bin);
            done();
        });
    });

    it('finds eicar virus in message', function (done) {
        clamav.binFound(function (err, bin) {
            if (err) return done(err);
            clamav.available.bin = bin;

            clamav.scanBin(virusMsg, function (err, results) {
                assert.ifError(err);
                // console.log(results);
                assert.ok(results.infected);
                assert.equal(results.name, 'Eicar-Test-Signature');
                done();
            });
        });
    });

    it('passes a clean message', function (done) {
        clamav.binFound(function (err, bin) {
            if (err) return done(err);
            clamav.available.bin = bin;

            clamav.scanBin(cleanMsg, function (err, results) {
                assert.ifError(err);
                assert.equal(results.infected, false);
                assert.equal(results.name, '');
                done();
            });
        });
    });
});

describe('clamav clamd TCP', function () {

    it('is listening', function (done) {
        clamav.tcpListening(function (err, listening) {
            assert.ifError(err);
            assert.ok(listening);
            done();
        });
    });

    it('is working', function (done) {
        clamav.tcpAvailable(function (err, available) {
            assert.ifError(err);
            assert.ok(available);
            done();
        });
    });

    it('detects virus in message', function (done) {
        clamav.scanTcp(virusMsg, function (err, result) {
            assert.ifError(err);
            // console.log(result);
            assert.equal(result.infected, true);
            assert.equal(result.name, 'Eicar-Test-Signature');
            done();
        });
    });

    it('passes a clean message', function (done) {
        clamav.scanTcp(cleanMsg, function (err, result) {
            // console.log(result);
            assert.ifError(err);
            assert.equal(result.infected, false);
            done();
        });
    });
});

describe('clamav clamd unix socket', function () {

    it('is listening', function (done) {
        clamav.socketFound(function (err, listening) {
            assert.ifError(err);
            assert.ok(listening);
            done();
        });
    });

    it('is working', function (done) {
        clamav.socketAvailable(function (err, available) {
            assert.ifError(err);
            assert.ok(available);
            done();
        });
    });

    it('detects virus in message', function (done) {
        clamav.scanSocket(virusMsg, function (err, result) {
            assert.ifError(err);
            // console.log(result);
            assert.equal(result.infected, true);
            assert.equal(result.name, 'Eicar-Test-Signature');
            done();
        });
    });

    it('passes a clean message', function (done) {
        clamav.scanSocket(cleanMsg, function (err, result) {
            // console.log(result);
            assert.ifError(err);
            assert.equal(result.infected, false);
            done();
        });
    });
});

describe('clamav', function () {
    it('is available', function (done) {
        clamav.isAvailable(function (err, listening) {
            // console.log(arguments);
            assert.ifError(err);
            assert.ok(listening);
            done();
        });
    });

    it('scans viruses', function (done) {
        clamav.scan(virusMsg, function (err, result) {
            assert.ifError(err);
            assert.equal(result.infected, true);
            done();
        });
    });

    it('scans clean', function (done) {
        clamav.scan(cleanMsg, function (err, result) {
            assert.ifError(err);
            assert.equal(result.infected, false);
            done();
        });
    });
});