'use strict';

var child  = require('child_process');
var path   = require('path');
var util   = require('util');

var logger = require('./logger');
var BaseScanner = require('./base-scanner');

function Scanner (name) {
    BaseScanner.call(this);

    this.name = name || 'bitdefender';

    this.init();

    if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'bdscan';
    if (!this.cfg.cli.args) this.cfg.cli.args = '--no-list';

    this.failFile = path.resolve('test/files/eicar.eml');
    this.passFile = path.resolve('test/files/clean.eml');

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

Scanner.prototype.scanBin = function (file, done) {
    var s = this;

    s.binCmd(file, function (err, cmd) {
        if (err) return done(err);
        logger.debug(cmd);

        child.exec(cmd, function (error, stdout, stderr) {
            if (error) {
                if (error.code === 1) {
                    // normal when a virus is found.
                }
                else {
                    logger.error(error);
                    return done(error);
                }
            }
            if (stderr) {
                logger.error('stderr');
                return done(stderr);
            }

            if (!stdout) return done(new Error('no stdout?'));

            // logger.info('stdout: ' + stdout);
            done(null, s.parseScanReply(stdout));
        });
    });
};

Scanner.prototype.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: this.name,
        raw: response,
        error: [],
    };

    logger.info(response);
    var r = response.match(/Infected files: ([\d]+)\s/);
    if (r[1] === '0') {
        result.pass.push('clean');
        return result;
    }

    r = response.match(/infected: ([^\n\n]+)/);
    result.fail.push(r[1]);

    return result;
};

module.exports = {
    createScanner: function (name) {
        return new Scanner(name);
    }
};
