'use strict';

var path   = require('path');
var util   = require('util');

var logger = require('./logger');
var BaseScanner = require('./base-scanner');

function Scanner (name) {
    BaseScanner.call(this);

    this.name = name || 'opendkim';

    this.init();

    if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'opendkim';
    if (!this.cfg.cli.args) this.cfg.cli.args = '-t';

    this.failFile = path.resolve('test/files/dkim-invalid.eml');
    this.passFile = path.resolve('test/files/dkim-valid.eml');

    logger.debug(util.inspect(this, { depth: null }));
}

util.inherits(Scanner, BaseScanner);

Scanner.prototype.isFound = function (done) {
    var s = this;
    s.binFound(function (err, bin) {
        if (err) logger.error(err);
        if (bin) {
            s.found.any = 'cli';
            return done(null, s.found.any);
        }
        s.found.any = false;
        done(null, s.found.any);
    });
};

Scanner.prototype.isAvailable = function (done) {
    var s = this;
    s.binAvailable(function (err, bin) {
        if (bin) {
            s.available.any = 'cli';
            return done(null, s.available.any);
        }
        s.available.any = false;
        done(null, s.available.any);
    });
};

Scanner.prototype.scan = function (file, done) {
    var s = this;
    switch (s.available.any) {
        case 'cli':
            return s.scanBin(file, done);
        default:
            // s.isAvailable(done);
    }
};

Scanner.prototype.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: 'opendkim',
        raw: response,
        error: [],
    };

    // logger.info(response);
    // 'opendkim: /tmp/clean.eml: message not signed\n'
    // '... verification (s=mar2013, d=tnpi.net, 2048-bit key) succeeded'
    // 'verification (s=mar2013 d=tnpi.net, 2048-bit key, insecure) failed'

    var parts = response.trim().split(/:\s/);

    if (/^verification.*succeeded$/.test(parts[2])) {
        result.pass.push(parts[2]);
        return result;
    }

    result.fail.push(parts[2]);

    return result;
};

module.exports = {
    createScanner: function (name) {
        return new Scanner(name);
    }
};
