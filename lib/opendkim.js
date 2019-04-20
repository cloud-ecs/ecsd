'use strict';

var path   = require('path');
var util   = require('util');

var logger = require('./logger');
var BaseScanner = require('./base-scanner');

class Scanner extends BaseScanner {
    constructor (name) {
        super()

        this.name = name || 'opendkim'

        this.init()

        if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'opendkim'
        if (!this.cfg.cli.args) this.cfg.cli.args = '-t'

        this.failFile = path.resolve('test/files/dkim-invalid.eml')
        this.passFile = path.resolve('test/files/dkim-valid.eml')

        logger.debug(util.inspect(this, { depth: null }))
    }

    isFound (done) {
        this.binFound((err, bin) => {
            if (err) logger.error(err);
            if (bin) {
                this.found.any = 'cli'
                return done(null, this.found.any)
            }
            this.found.any = false
            done(null, this.found.any)
        })
    }

    isAvailable (done) {
        this.binAvailable((err, bin) => {
            if (bin) {
                this.available.any = 'cli'
                return done(null, this.available.any)
            }
            this.available.any = false
            done(null, this.available.any)
        })
    }

    scan (file, done) {
        switch (this.available.any) {
            case 'cli':
                return this.scanBin(file, done);
            default:
                // this.isAvailable(done);
        }
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        }

        // logger.info(response);
        // 'opendkim: /tmp/clean.eml: message not signed\n'
        // '... verification (s=mar2013, d=tnpi.net, 2048-bit key) succeeded'
        // 'verification (s=mar2013 d=tnpi.net, 2048-bit key, insecure) failed'

        const parts = response.trim().split(/:\s/);

        if (/^verification.*succeeded$/.test(parts[2])) {
            result.pass.push(parts[2]);
            return result;
        }

        result.fail.push(parts[2]);

        return result;
    }
}

module.exports = {
    createScanner: (name) => {
        return new Scanner(name)
    }
}
