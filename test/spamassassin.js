'use strict';

var assert = require('assert');
var path   = require('path');

var spam  = require('../lib/spamassassin');

var spamMsg = path.resolve('test/files/gtube.eml');
var hamMsg  = path.resolve('test/files/clean.eml');

var isTravis = /worker/.test(require('os').hostname());
if (process.env.NODE_ENV !== 'cov' && isTravis) return;

before(function (done) {
    spam.isFound(function (err, found) {
        // console.log(arguments);
        done(err);
    });
});

describe('spamassassin spamc', function () {

    before(function (done) {
        spam.binFound(function (err, bin) {
            if (err) return done(err);
            done();
        });
    });

    it('finds gtube spam message', function (done) {
        spam.scanBin(spamMsg, function (err, results) {
            assert.ifError(err);
            assert.equal(results.fail.length, 1);
            done();
        });
    });

    it('passes a clean message', function (done) {
        spam.scanBin(hamMsg, function (err, results) {
            assert.ifError(err);
            console.log(results);
            assert.equal(results.pass.length, 1);
            done();
        });
    });
});

describe('spamd TCP', function () {

    before(function (done) {
        spam.tcpListening(function (err, listening) {
            if (err) return done(err);
            done();
        });
    });

    it('pings', function (done) {
        spam.tcpAvailable(function (err, avail) {
            assert.ifError(err);
            assert.ok(avail);
            done();
        });
    });

    it('detects a spam message', function (done) {
        spam.scanTcp(spamMsg, function (err, results) {
            assert.ifError(err);
            // console.log(result);
            assert.equal(results.fail.length, 1);
            done();
        });
    });

    it('passes a clean message', function (done) {
        spam.scanTcp(hamMsg, function (err, results) {
            // console.log(result);
            assert.ifError(err);
            assert.equal(results.pass.length, 1);
            done();
        });
    });
});

describe('spamd unix socket', function () {

    before(function (done) {
        spam.socketFound(function (err, listening) {
            if (err) return done(err);
            done();
        });
    });

    it('detects spam message', function (done) {
        spam.scanSocket(spamMsg, function (err, results) {
            assert.ifError(err);
            // console.log(result);
            assert.equal(results.fail.length, 1);
            done();
        });
    });

    it('passes a clean message', function (done) {
        spam.scanSocket(hamMsg, function (err, results) {
            // console.log(result);
            assert.ifError(err);
            assert.equal(results.pass.length, 1);
            done();
        });
    });
});

describe('spam scan dispatch', function () {

    before(function (done) {
        spam.isAvailable(function (err, available) {
            if (err) return done(err);
            if (!available) return done(new Error('spam not available'));
            done();
        });
    });

    it('scans spam', function (done) {
        spam.scan(spamMsg, function (err, results) {
            assert.ifError(err);
            assert.equal(results.fail.length, 1);
            done();
        });
    });

    it('scans clean', function (done) {
        spam.scan(hamMsg, function (err, results) {
            assert.ifError(err);
            assert.equal(results.pass.length, 1);
            done();
        });
    });
});
