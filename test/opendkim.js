'use strict';

var assert = require('assert');
var path   = require('path');

var opendkim = require('../lib/opendkim').createScanner();

var signedValidMsg = path.resolve('test/files/dkim-valid.eml');
var signedInvalidMsg = path.resolve('test/files/dkim-invalid.eml');
var unsignedMsg = path.resolve('test/files/clean.eml');

describe('opendkim', function () {
    this.timeout(3000);

    before(function (done) {
        opendkim.binFound(function (err, found) {
            if (err) return done(err);
            if (!found) return done(new Error('not installed?'));
            done();
        });
    });

    it('is found', function (done) {
        opendkim.binFound(function (err, binFound) {
            // console.log(arguments);
            assert.ifError(err);
            assert.ok(binFound);
            done();
        });
    });

    it('is available', function (done) {
        this.timeout(4000);
        opendkim.isAvailable(function (err, binFound) {
            // console.log(arguments);
            assert.ifError(err);
            assert.ok(binFound);
            done();
        });
    });

    it('valid signed message yields pass', function (done) {
        opendkim.binFound(function (err, bin) {
            if (err) return done(err);
            opendkim.available.bin = bin;

            opendkim.scanBin(signedValidMsg, function (err, results) {
                assert.ifError(err);
                // console.log(results);
                assert.ok(results.pass.length > 0);
                done();
            });
        });
    });

    this.timeout(4000);
    it('invalid signed message yields fail', function (done) {
        opendkim.binFound(function (err, bin) {
            if (err) return done(err);
            opendkim.available.bin = bin;

            opendkim.scanBin(signedInvalidMsg, function (err, results) {
                assert.ifError(err);
                // console.log(results);
                assert.ok(results.fail.length > 0);
                done();
            });
        });
    });

    it('unsigned message yields failure', function (done) {
        opendkim.binFound(function (err, bin) {
            if (err) return done(err);
            opendkim.available.bin = bin;

            opendkim.scanBin(unsignedMsg, function (err, results) {
                assert.ifError(err);
                // console.log(results);
                assert.ok(results.fail.length > 0);
                done();
            });
        });
    });
});

