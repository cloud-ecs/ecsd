'use strict';

var assert = require('assert');
var path   = require('path');

var dspam  = require('../lib/dspam');

var spamMsg  = path.resolve('test/files/gtube.eml');
var cleanMsg = path.resolve('test/files/clean.eml');

if (/worker/.test(require('os').hostname())) return;
console.log(require('os').hostname());

before(function (done) {
    dspam.isFound(function (err, found) {
        done(err);
    });
});

describe('dspam bin', function () {

    before(function (done) {
        dspam.binAvailable(function (err, bin) {
            if (err) return done(err);
            done();
        });
    });

    it.skip('detects spam message', function (done) {
        dspam.scanBin(spamMsg, function (err, results) {
            assert.ifError(err);
            // console.log(results);
            // naive bayes...
            assert.equal(results.spam, true);
            assert.ok(results.name);
            done();
        });
    });

    it('passes a clean message', function (done) {
        dspam.scanBin(cleanMsg, function (err, results) {
            assert.ifError(err);
            assert.equal(results.spam, false);
            assert.ok(results.name);
            done();
        });
    });
});

describe('dspam TCP', function () {

    before(function (done) {
        dspam.tcpListening(function (err, listening) {
            if (err) return done(err);
            done();
        });
    });

    it('pings', function (done) {
        dspam.ping(null, dspam.found.tcp, function (err, result) {
            assert.ifError(err);
            assert.ok(result);
            done();
        });
    });

    it.skip('detects a spam message', function (done) {
        dspam.scanTcp(spamMsg, function (err, result) {
            assert.ifError(err);
            // console.log(result);
            // silly naive bayes..., doesn't know any better...yet
            // assert.equal(result.spam, true);
            assert.ok(result.raw);
            done();
        });
    });

    it('passes a clean message', function (done) {
        dspam.scanTcp(cleanMsg, function (err, result) {
            // console.log(result);
            assert.ifError(err);
            assert.equal(result.spam, false);
            done();
        });
    });
});

describe.skip('dspam unix socket', function () {

    before(function (done) {
        dspam.socketFound(function (err, listening) {
            if (err) return done(err);
            done();
        });
    });

    it.skip('detects spam message', function (done) {
        dspam.scanSocket(spamMsg, function (err, result) {
            assert.ifError(err);
            // console.log(result);
            // dspam is naive when untrained, so it won't catch this
            assert.equal(result.spam, true);
            done();
        });
    });

    it('passes a clean message', function (done) {
        dspam.scanSocket(cleanMsg, function (err, result) {
            console.log(result);
            assert.ifError(err);
            assert.equal(result.spam, false);
            done();
        });
    });
});

describe('dspam scan dispatch', function () {

    before(function (done) {
        dspam.isAvailable(function (err, available) {
            if (err) return done(err);
            if (!available) return done(new Error('dspam not available'));
            done();
        });
    });

    it.skip('scans spam', function (done) {
        dspam.scan(spamMsg, function (err, result) {
            assert.ifError(err);
            assert.equal(result.spam, true);
            done();
        });
    });

    it('scans clean', function (done) {
        dspam.scan(cleanMsg, function (err, result) {
            assert.ifError(err);
            assert.equal(result.spam, false);
            done();
        });
    });
});
