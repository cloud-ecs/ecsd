'use strict';

var child   = require('child_process');
// var fs      = require('fs');
var net     = require('net');
var path    = require('path');

var logger  = require('./logger');

function Scanner (name) {
    this.name = name || 'all-about-that-base';

    this.init();

    this.failFile = path.resolve('test/files/gtube.eml');
    this.passFile = path.resolve('test/files/clean.eml');
}

Scanner.prototype.init = function (name) {
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
    };
};
Scanner.prototype.initCfg = function () {
    this.config  = require('./config').loadConfig();
    this.cfg     = this.config[this.name];

    if (!this.cfg)          this.cfg = {};
    if (!this.cfg.timeout)  this.cfg.timeout = 30;
    if (!this.cfg.cli)      this.cfg.cli = {};
    if (!this.cfg.cli.args) this.cfg.cli.args = '';
    if (!this.cfg.net)      this.cfg.net = {};
};
Scanner.prototype.findBin = require('./detect-cli').findBin;
Scanner.prototype.findTcp = require('./detect-tcp').findTcp;
Scanner.prototype.findSocket = require('./detect-socket').findSocket;

Scanner.prototype.isFound = function (done) {
    var s = this;
    s.socketFound(function (err, sock) {
        if (err) logger.error(err);
        if (sock) {
            s.found.any = 'socket';
            return done(null, s.found.any);
        }
        s.binFound(function (err, bin) {
            if (err) logger.error(err);
            if (bin) {
                s.found.any = 'cli';
                return done(null, s.found.any);
            }
            s.tcpListening(function (err, sock) {
                if (err) logger.error(err);
                if (sock) {
                    s.found.any = 'tcp';
                    return done(null, s.found.any);
                }
                s.found.any = false;
                done(null, s.found.any);
            });
        });
    });
};

Scanner.prototype.isAvailable = function (done) {
    var s = this;
    s.socketAvailable(function (err, sock) {
        if (sock) {
            s.available.any = 'socket';
            return done(null, s.available.any);
        }
        s.binAvailable(function (err, bin) {
            if (bin) {
                s.available.any = 'cli';
                return done(null, s.available.any);
            }
            s.tcpAvailable(function (err, sock) {
                if (sock) {
                    s.available.any = 'tcp';
                    return done(null, s.available.any);
                }
                s.available.any = false;
                done(null, s.available.any);
            });
        });
    });
};

Scanner.prototype.scan = function (file, done) {
    var s = this;
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
};

Scanner.prototype.binFound = function (done) {
    var s = this;
    if (!s.cfg.cli.bin) return done(new Error('no bin configured'));

    s.findBin(s.cfg.cli.bin, null, function (scanBin) {
        if (!scanBin) {
            return done(new Error(s.cfg.cli.bin + ' not found'));
        }
        s.found.cli = scanBin;
        done(null, scanBin);
    });
};

Scanner.prototype.binAvailable = function (done) {
    var s = this;
    s.binFound(function (err, bin) {
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
            });
        });
    });
};

Scanner.prototype.binCmd = function (file, done) {
    var s = this;
    if (!s.found.cli) {
        return done(new Error('cli not found'));
    }

    done(null, s.found.cli + ' ' + s.cfg.cli.args + ' ' + file);
};

Scanner.prototype.scanBin = function (file, done) {
    var s = this;

    s.binCmd(file, function (err, cmd) {
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
        });
    });
};

Scanner.prototype.parseScanReply = function (response) {
    return 'parseScanReply must be overloaded';
};

Scanner.prototype.tcpListening = function (done) {
    var s = this;
    if (!s.cfg.net) return done(new Error('no network config'));

    s.findTcp(s.cfg.net, function (err, listening) {
        if (err) return done(err);
        s.found.tcp = listening;
        done(null, listening);
    });
};

Scanner.prototype.tcpAvailable = function (done) {
    var s = this;
    s.tcpListening(function (err, listening) {
        if (err) return done(err);

        var socket = new net.Socket();
        socket.setTimeout(5 * 1000);

        s.ping(socket, s.cfg.net, function (err, pings) {
            if (err) return done(err);
            s.available.tcp = pings;
            done(null, pings);
        });
    });
};

Scanner.prototype.scanTcp = function (file, done) {
    return done(new Error('scanTCP must be overloaded'));
};

Scanner.prototype.ping = function (socket, connOpts, done) {
    return done(new Error('ping must be overloaded'));
};

Scanner.prototype.socketFound = function (done) {
    var s = this;
    var sockFile = s.cfg.socket;
    if (!sockFile) return done(new Error('no socket file'));

    s.findSocket(sockFile, null, function (sockPath) {
        if (!sockPath) return done(new Error(sockFile + ' not found'));
        s.found.socket = { path: sockPath };
        done(null, s.found.socket);
    });
};

Scanner.prototype.socketAvailable = function (done) {
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
};

Scanner.prototype.scanSocket = function (file, done) {
    return done(new Error('scanSocket must be overloaded'));
};

module.exports = Scanner;
