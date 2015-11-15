'use strict';

// var child   = require('child_process');
var fs      = require('fs');
var net     = require('net');
var path    = require('path');
var util    = require('util');

// var logger  = require('./logger');
var BaseScanner = require('./base-scanner');

function Scanner (name) {
    BaseScanner.call(this);

    this.name = name || 'spamassassin';

    this.init();

    if (!this.cfg.socket)   this.cfg.socket   = 'spamd.socket';
    if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'spamc';
    if (!this.cfg.cli.args) this.cfg.cli.args = ' -R < ';
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0';
    if (!this.cfg.net.port) this.cfg.net.port = '783';

    this.failFile = path.resolve('test/files/gtube.eml');
    this.passFile = path.resolve('test/files/clean.eml');

    // logger.info(util.inspect(this, { depth: null }));
}

util.inherits(Scanner, BaseScanner);

Scanner.prototype.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: this.name,
        raw: response,
        error: [],
    };

    // logger.info(response);
    if (/as possible spam/.test(response)) {
        result.fail.push('spam');
        return result;
    }
    if (/X-Spam-Flag: YES/.test(response)) {
        result.fail.push('spam');
        return result;
    }

    var match = response.match(/Spam: True ; ([\d\.]+) \/ [\d\.]+/);
    if (match) {
        // logger.info(match[1]);
        result.fail.push(match[1]);
        return result;
    }

    result.pass.push('ham');
    return result;
};

Scanner.prototype.ping = function (socket, connOpts, done) {
    var pingErr = undefined;

    socket.connect(connOpts, function () {
        socket.write('PING SPAMC/1.4\r\n\r\n');
    })
    .on('end', function () {
        if (pingErr) return done(pingErr);
        done(null, true);
    })
    .on('data', function (data) {
        if (/PONG/.test(data.toString())) {
            return socket.end();
        }
        pingErr = new Error('unexpected: ' + data.toString());
        socket.end();
    })
    .on('close', function (err) {
        if (err) {
            logger.info('on.close');
            logger.error('transmision errors encountered');
        }
    })
    .on('error', function (err) {
        logger.info('error');
        done(err);
    });
};

Scanner.prototype.scanTcp = function (file, done) {
    var s = this;
    if (!s.found.tcp) return done(new Error('TCP listener not found'));

    var scanErr = '';
    var socket = s.getSocket(scanErr, done);

    var filePath = path.resolve(file);
    fs.stat(filePath, function (err, stat) {
        var headers = [
            'SYMBOLS SPAMC/1.5',
            'Content-length: ' + stat.size,
        ];
        var cmd = headers.join('\r\n') + '\r\n\r\n';
        // logger.info(cmd);

        socket.connect(s.cfg.net, function () {
            socket.write(cmd, function () {
                fs.createReadStream(file)
                .pipe(socket)
                .on('end', function () {
                    // logger.info('sent file!');
                })
                .on('error', function (err) {
                    logger.error(err);
                });
            });
        });
    });
};

Scanner.prototype.scanSocket = function (file, done) {
    var s = this;
    if (!file) return done(new Error('file is required!'));
    if (!s.found.socket) return done(new Error('TCP listener not found'));

    var scanErr = '';
    var socket = s.getSocket(scanErr, done);

    var filePath = path.resolve(file);
    fs.stat(filePath, function (err, stat) {
        var headers = [
            'SYMBOLS SPAMC/1.5',
            'Content-length: ' + stat.size,
        ];

        var cmd = headers.join('\r\n') + '\r\n\r\n';

        socket.connect(s.found.socket, function () {
            socket.write(cmd, function () {
                fs.createReadStream(file)
                .pipe(socket)
                .on('end', function () {
                    // logger.info('sent file!');
                })
                .on('error', function (err) {
                    logger.error(err);
                });
            });
        });
    });
};

Scanner.prototype.getSocket = function (scanErr, done) {
    var s = this;

    var socket = new net.Socket();
    var allData = '';

    socket.setTimeout(s.cfg.timeout * 1000);
    socket.on('end', function () {
        if (scanErr) return done(scanErr);
        done(null, s.parseScanReply(allData));
    })
    .on('data', function (data) {
        allData += data;
    })
    .on('close', function (err) {
        if (err) {
            logger.info('on.close');
            logger.error('transmision errors encountered');
        }
        // logger.debug('close');
    })
    .on('error', function (err) {
        logger.error('error');
        logger.error(err);
        done(err);
    });

    return socket;
};

module.exports = {
    createScanner: function (name) {
        return new Scanner(name);
    }
};
