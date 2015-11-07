'use strict';

var assert = require('assert');
var path   = require('path');

var spam  = require('../lib/spamassassin');

var spamMsg = path.resolve('test/files/gtube.eml');
var hamMsg  = path.resolve('test/files/clean.eml');

if (/worker/.test(require('os').hostname())) return;
console.log(require('os').hostname());

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
      assert.equal(results.spam, true);
      done();
    });
  });

  it('passes a clean message', function (done) {
    spam.scanBin(hamMsg, function (err, results) {
      assert.ifError(err);
      assert.equal(results.spam, false);
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
    spam.scanTcp(spamMsg, function (err, result) {
      assert.ifError(err);
      // console.log(result);
      assert.equal(result.spam, true);
      done();
    });
  });

  it('passes a clean message', function (done) {
    spam.scanTcp(hamMsg, function (err, result) {
      // console.log(result);
      assert.ifError(err);
      assert.equal(result.spam, false);
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
    spam.scanSocket(spamMsg, function (err, result) {
      assert.ifError(err);
      // console.log(result);
      assert.equal(result.spam, true);
      done();
    });
  });

  it('passes a clean message', function (done) {
    spam.scanSocket(hamMsg, function (err, result) {
      // console.log(result);
      assert.ifError(err);
      assert.equal(result.spam, false);
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

  it('scans viruses', function (done) {
    spam.scan(spamMsg, function (err, result) {
      assert.ifError(err);
      assert.equal(result.spam, true);
      done();
    });
  });

  it('scans clean', function (done) {
    spam.scan(hamMsg, function (err, result) {
      assert.ifError(err);
      assert.equal(result.spam, false);
      done();
    });
  });
});
