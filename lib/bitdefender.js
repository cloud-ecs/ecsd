'use strict';

const child  = require('child_process');
const path   = require('path');
const util   = require('util');

const logger = require('./logger');
const BaseScanner = require('./base-scanner');

class Scanner extends BaseScanner {
    constructor (name) {
        super()

        this.name = name || 'bitdefender';

        this.init();

        if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'bdscan';
        if (!this.cfg.cli.args) this.cfg.cli.args = '--no-list';

        this.failFile = path.resolve('test/files/eicar.eml');
        this.passFile = path.resolve('test/files/clean.eml');

        logger.debug(util.inspect(this, { depth: null }));
    }

    isFound (done) {
        this.binFound((err, bin) => {
            if (err) logger.error(err);
            if (bin) {
                this.found.any = 'cli';
                return done(null, this.found.any);
            }
            this.found.any = false;
            done(null, this.found.any);
        })
    }

    isAvailable (done) {
        this.binAvailable((err, bin) => {
            if (bin) {
                this.available.any = 'cli';
                return done(null, this.available.any);
            }
            this.available.any = false;
            done(null, this.available.any);
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

    scanBin (file, done) {

        this.binCmd(file, (err, cmd) => {
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
                done(null, this.parseScanReply(stdout));
            })
        })
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        };

        logger.info(response);
        let r = response.match(/Infected files: ([\d]+)\s/);
        if (r[1] === '0') {
            result.pass.push('clean');
            return result;
        }

        r = response.match(/infected: ([^\n\n]+)/);
        result.fail.push(r[1]);

        return result;
    }
}

module.exports = {
    createScanner: (name) => {
        return new Scanner(name);
    }
}
