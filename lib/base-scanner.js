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

    init (name) {
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
        var s = this;
        s.socketAvailable((err, sock) => {
            if (sock) {
                s.available.any = 'socket';
                return done(null, s.available.any);
            }
            s.binAvailable((err, bin) => {
                if (bin) {
                    s.available.any = 'cli';
                    return done(null, s.available.any);
                }
                s.tcpAvailable((err, sock) => {
                    if (sock) {
                        s.available.any = 'tcp';
                        return done(null, s.available.any);
                    }
                    s.available.any = false;
                    done(null, s.available.any);
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
        var s = this;
        if (!s.cfg.cli.bin) return done(new Error('no bin configured'));

        s.findBin(s.cfg.cli.bin, null, function (scanBin) {
            if (!scanBin) {
                return done(new Error(s.cfg.cli.bin + ' not found'));
            }
            s.found.cli = scanBin;
            done(null, scanBin);
        })
    }

    binAvailable (done) {
        const s = this;
        s.binFound((err, bin) => {
            if (err) return done(err);

            s.scanBin(s.failFile, function (err, results) {
                if (err) return done(err);
                if (!results.fail || results.fail.length === 0) {
                    logger.error(results);
                    return done(new Error('negative detection failed'));
                }

                s.scanBin(s.passFile, function (err, results) {
                    if (err) return done(err);
                    if (results.pass.length === 0) {
                        return done(new Error('positive detection failed'));
                    }
                    s.available.cli = true;
                    done(null, true);
                })
            })
        })
    }

    binCmd (file, done) {
        var s = this;
        if (!s.found.cli) {
            return done(new Error('cli not found'));
        }

        done(null, s.found.cli + ' ' + s.cfg.cli.args + ' ' + file);
    }

    scanBin (file, done) {
        var s = this;

        s.binCmd(file, (err, cmd) => {
            if (err) return done(err);
            logger.debug(cmd);

            child.exec(cmd, function (error, stdout, stderr) {
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
                done(null, s.parseScanReply(stdout));
            })
        })
    }

    parseScanReply (response) {
        return 'parseScanReply must be overloaded';
    }

    tcpListening (done) {
        var s = this;
        if (!s.cfg.net) return done(new Error('no network config'));

        s.findTcp(s.cfg.net, (err, listening) => {
            if (err) return done(err);
            s.found.tcp = listening;
            done(null, listening);
        })
    }

    tcpAvailable (done) {
        var s = this;
        s.tcpListening((err, listening) => {
            if (err) return done(err);

            var socket = new net.Socket();
            socket.setTimeout(5 * 1000);

            s.ping(socket, s.cfg.net, (err, pings) => {
                if (err) return done(err);
                s.available.tcp = pings;
                done(null, pings);
            });
        });
    }

    scanTcp (file, done) {
        return done(new Error('scanTCP must be overloaded'));
    }

    ping (socket, connOpts, done) {
        return done(new Error('ping must be overloaded'));
    }

    socketFound (done) {
        var s = this;
        var sockFile = s.cfg.socket;
        if (!sockFile) return done(new Error('no socket file'));

        s.findSocket(sockFile, null, function (sockPath) {
            if (!sockPath) return done(new Error(sockFile + ' not found'));
            s.found.socket = { path: sockPath };
            done(null, s.found.socket);
        });
    }

    socketAvailable (done) {
        var s = this;
        s.socketFound(function (err, socketPath) {
            if (err) return done(err);

            var socket = new net.Socket();
            socket.setTimeout(5 * 1000);

            s.ping(socket, s.found.socket, function (err, pings) {
                if (err) return done(err);
                s.available.socket = pings;
                done(null, pings);
            });
        });
    }

    scanSocket (file, done) {
        return done(new Error('scanSocket must be overloaded'));
    }
}

module.exports = Scanner;
