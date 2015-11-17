'use strict';

var fs      = require('fs');
var net     = require('net');
var path    = require('path');
var lmtp    = require('smtp-connection');
var util    = require('util');

var BaseScanner = require('./base-scanner');

function Scanner (name) {
    BaseScanner.call(this);

    this.name = name || 'dspam';

    this.init();

    if (!this.cfg.socket)   this.cfg.socket   = 'dspam.sock';
    if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'dspam';
    if (!this.cfg.cli.args) {
        this.cfg.cli.args = '--mode=tum --process --deliver=summary --stdout <';
    }
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0';
    if (!this.cfg.net.port) this.cfg.net.port = '24';

    this.failFile = path.resolve('test/files/gtube.eml');
    this.passFile = path.resolve('test/files/clean.eml');

    // logger.info(util.inspect(this, { depth: null }));
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
        s.socketFound(function (err, sock) {
            if (err) logger.error(err);
            if (sock) {
                s.found.any = 'socket';
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
    s.binAvailable(function (err, bin) {
        if (bin) {
            s.available.any = 'cli';
            return done(null, s.available.any);
        }
        s.socketAvailable(function (err, sock) {
            if (sock) {
                s.available.any = 'socket';
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

Scanner.prototype.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: this.name,
        raw: response,
        error: [],
    };

    // console.log(response);

    if (typeof response === 'object') {
        result.raw = response.response;
        if (response.rejected.length > 0) {
            result.fail.push(response.rejected);
            return result;
        }
        result.pass.push(response.accepted[0]);
        return result;
    }

    // X-DSPAM-Result: matt; result="Innocent"; class="Innocent"; probability=0.0023;
    //     confidence=1.00; signature=56419144723296644318707
    var parts = response.split(/; /);
    var sig = parts[5].split(/=/).pop().trim();
    if (parts[1].split(/=/).pop() === '"Innocent"') {
        result.pass.push(sig);
        return result;
    }

    result.fail.push(sig);
    return result;
};

Scanner.prototype.ping = function (socket, connOpts, done) {
    var pingErr;

    if (!socket) {
        socket = new net.Socket();
        socket.setTimeout(5 * 1000);
    }

    socket.connect(connOpts, function () {
        socket.write('LHLO\r\n');
    })
    .on('end', function () {
        if (pingErr) return done(pingErr);
        done(null, true);
    })
    .on('data', function (data) {
        if (/DSPAM LMTP [0-9\.]+ Ready/.test(data.toString())) {
            socket.write('QUIT\r\n');
            // return socket.end();
        }
        // pingErr = new Error('unexpected: ' + data.toString());
        // socket.end();
    })
    .on('close', function (err) {
        if (err) {
            console.log('on.close');
            console.error('transmission errors encountered');
        }
    })
    .on('error', function (err) {
        console.log('error');
        done(err);
    });
};

Scanner.prototype.scanTcp = function (file, done) {
    var s = this;
    if (!s.found.tcp) {
        return done(new Error('TCP listener not found'));
    }

    var connection = new lmtp({
        lmtp: true,
        port: s.cfg.net.port,
        host: s.cfg.net.host,
    });

    connection
    .on('error', function (err) {
        console.error(err);
        done(err);
    });

    fs.readFile(file, function (err, data) {
        if (err) console.error(err);
        // console.log(data.toString());
        var envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };
        // TODO: get this via request
        connection.connect(function () {
            connection.send(envelope, data.toString(), function (err, res) {
                if (err) return done(err);
                done(err, s.parseScanReply(res));
            });
        });
    });
};

Scanner.prototype.scanSocket = function (file, done) {
    var s = this;
    if (!file) return done(new Error('file is required!'));
    if (!s.found.socket) {
        return done(new Error('TCP listener not found'));
    }

    var connection = new lmtp({
        lmtp: true,
        socket: s.found.socket.path,
    });

    connection
    .on('error', function (err) {
        console.error(err);
        done(err);
    });

    fs.readFile(file, function (err, data) {
        if (err) console.error(err);
        // console.log(data.toString());
        var envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };
        // TODO: get this via request
        connection.connect(function () {
            connection.send(envelope, data.toString(), function (err, res) {
                if (err) return done(err);
                done(err, s.parseScanReply(res));
            });
        });
    });
};

module.exports = {
    createScanner: function (name) {
        return new Scanner(name);
    }
};
