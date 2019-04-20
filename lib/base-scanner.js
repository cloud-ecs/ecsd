'use strict';

const child   = require('child_process');
// const fs      = require('fs');
const net     = require('net');
const path    = require('path');

const logger  = require('./logger');

class Scanner {
    constructor (name) {
        this.name = name || 'all-about-that-base';

        this.init();

        this.failFile = path.resolve('test/files/gtube.eml');
        this.passFile = path.resolve('test/files/clean.eml');

        this.findBin = require('./detect-cli').findBin
        this.findTcp = require('./detect-tcp').findTcp
        this.findSocket = require('./detect-socket').findSocket;
    }

    init () {
        this.initCfg();

        this.found = {
            any: false,
            cli: undefined,
            tcp: undefined,
            socket: undefined
        };

        this.available = {
            any: false,
            cli: false,
            tcp: false,
            socket: false
        }
    }

    initCfg () {
        this.config  = require('./config').loadConfig();
        this.cfg     = this.config[this.name];

        if (!this.cfg)          this.cfg = {};
        if (!this.cfg.timeout)  this.cfg.timeout = 30;
        if (!this.cfg.cli)      this.cfg.cli = {};
        if (!this.cfg.cli.args) this.cfg.cli.args = '';
        if (!this.cfg.net)      this.cfg.net = {};
    }

    isFound (done) {
        const s = this;
        s.socketFound((err, sock) => {
            if (err) logger.error(err);
            if (sock) {
                s.found.any = 'socket';
                return done(null, s.found.any);
            }
            s.binFound((err, bin) => {
                if (err) logger.error(err);
                if (bin) {
                    s.found.any = 'cli';
                    return done(null, s.found.any);
                }
                s.tcpListening((err, sock) => {
                    if (err) logger.error(err);
                    if (sock) {
                        s.found.any = 'tcp';
                        return done(null, s.found.any);
                    }
                    s.found.any = false;
                    done(null, s.found.any);
                })
            })
        })
    }

    isAvailable (done) {
        this.socketAvailable((err, sock) => {
            if (sock) {
                this.available.any = 'socket';
                return done(null, this.available.any);
            }
            this.binAvailable((err, bin) => {
                if (bin) {
                    this.available.any = 'cli';
                    return done(null, this.available.any);
                }
                this.tcpAvailable((err, sock) => {
                    if (sock) {
                        this.available.any = 'tcp';
                        return done(null, this.available.any);
                    }
                    this.available.any = false;
                    done(null, this.available.any);
                })
            })
        })
    }

    scan (file, done) {
        const s = this;
        switch (s.available.any) {
            case 'tcp':
                return s.scanTcp(file, done);
            case 'socket':
                return s.scanSocket(file, done);
            case 'cli':
                return s.scanBin(file, done);
            default:
                s.isAvailable(done);
        }
    }

    binFound (done) {
        if (!this.cfg.cli.bin) return done(new Error('no bin configured'));

        this.findBin(this.cfg.cli.bin, null, (scanBin) => {
            if (!scanBin) {
                return done(new Error(this.cfg.cli.bin + ' not found'));
            }
            this.found.cli = scanBin;
            done(null, scanBin);
        })
    }

    binAvailable (done) {
        this.binFound((err, bin) => {
            if (err) return done(err);

            this.scanBin(this.failFile, (err, results) => {
                if (err) return done(err);
                if (!results.fail || results.fail.length === 0) {
                    logger.error(results);
                    return done(new Error('negative detection failed'));
                }

                this.scanBin(this.passFile, (err, results) => {
                    if (err) return done(err);
                    if (results.pass.length === 0) {
                        return done(new Error('positive detection failed'));
                    }
                    this.available.cli = true;
                    done(null, true);
                })
            })
        })
    }

    binCmd (file, done) {
        if (!this.found.cli) {
            return done(new Error('cli not found'));
        }

        done(null, this.found.cli + ' ' + this.cfg.cli.args + ' ' + file);
    }

    scanBin (file, done) {

        this.binCmd(file, (err, cmd) => {
            if (err) return done(err);
            logger.debug(cmd);

            child.exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    logger.error('exec error');
                    return done(error);
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
        return 'parseScanReply must be overloaded';
    }

    tcpListening (done) {
        if (!this.cfg.net) return done(new Error('no network config'));

        this.findTcp(this.cfg.net, (err, listening) => {
            if (err) return done(err);
            this.found.tcp = listening;
            done(null, listening);
        })
    }

    tcpAvailable (done) {
        this.tcpListening((err, listening) => {
            if (err) return done(err)

            const socket = new net.Socket()
            socket.setTimeout(5 * 1000)

            this.ping(socket, this.cfg.net, (err, pings) => {
                if (err) return done(err)
                this.available.tcp = pings;
                done(null, pings)
            })
        })
    }

    scanTcp (file, done) {
        return done(new Error('scanTCP must be overloaded'));
    }

    ping (socket, connOpts, done) {
        return done(new Error('ping must be overloaded'));
    }

    socketFound (done) {
        const sockFile = this.cfg.socket;
        if (!sockFile) return done(new Error('no socket file'));

        this.findSocket(sockFile, null, (sockPath) => {
            if (!sockPath) return done(new Error(`${sockFile} not found`));
            this.found.socket = { path: sockPath };
            done(null, this.found.socket);
        });
    }

    socketAvailable (done) {
        this.socketFound((err, socketPath) => {
            if (err) return done(err);

            const socket = new net.Socket();
            socket.setTimeout(5 * 1000);

            this.ping(socket, this.found.socket, (err, pings) => {
                if (err) return done(err);
                this.available.socket = pings;
                done(null, pings);
            });
        });
    }

    scanSocket (file, done) {
        return done(new Error('scanSocket must be overloaded'));
    }
}

module.exports = Scanner;
