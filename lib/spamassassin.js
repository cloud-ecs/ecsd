'use strict';

var child   = require('child_process');
var fs      = require('fs');
var net     = require('net');
var path    = require('path');

var cfg     = require('./config').loadConfig();

if (!cfg.spamassassin) cfg.spamassassin = {};  // in case .ini is missing
if (!cfg.spamassassin.timeout) {
    cfg.spamassassin.timeout = 30;  // seconds
}

var findBin    = require('./detect-cli').findBin;
var findTcp    = require('./detect-tcp').findTcp;
var findSocket = require('./detect-socket').findSocket;

var spamFile   = path.resolve('test/files/gtube.eml');
var cleanFile  = path.resolve('test/files/clean.eml');

exports.found = {
    cli: undefined,
    tcp: undefined,
    socket: undefined
};

exports.available = {
    any: false,
    cli: false,
    tcp: false,
    socket: false
};

exports.isFound= function (done) {
    exports.socketFound(function (err, sock) {
        if (sock) {
            exports.found.any = 'socket';
            return done(null, exports.found.any);
        }
        exports.binFound(function (err, bin) {
            if (bin) {
                exports.found.any = 'cli';
                return done(null, exports.found.any);
            }
            exports.tcpListening(function (err, sock) {
                if (sock) {
                    exports.found.any = 'tcp';
                    return done(null, exports.found.any);
                }
                exports.found.any = false;
                done(null, exports.found.any);
            });
        });
    });
};

exports.isAvailable = function (done) {
    exports.socketAvailable(function (err, sock) {
        if (sock) {
            exports.available.any = 'socket';
            return done(null, exports.available.any);
        }
        exports.binAvailable(function (err, bin) {
            if (bin) {
                exports.available.any = 'cli';
                return done(null, exports.available.any);
            }
            exports.tcpAvailable(function (err, sock) {
                if (sock) {
                    exports.available.any = 'tcp';
                    return done(null, exports.available.any);
                }
                exports.available.any = false;
                done(null, exports.available.any);
            });
        });
    });
};

exports.binFound = function (done) {
    var bin = cfg.spamassassin.cli || 'spamc';

    findBin(bin, null, function (scanBin) {
        if (!scanBin) {
            return done(new Error(bin + ' not found'));
        }
        exports.found.cli = scanBin;
        done(null, scanBin);
    });
};

exports.binAvailable = function (done) {
    exports.binFound(function (err, bin) {
        if (err) return done(err);

        exports.scanBin(spamFile, function (err, results) {
            if (err) return done(err);
            if (!results.fail || results.fail.length === 0) {
                return done(new Error('spam detection failed'));
            }

            exports.scanBin(cleanFile, function (err, results) {
                if (err) return done(err);
                if (results.pass.length === 0) {
                    return done(new Error('clean detection failed'));
                }
                exports.available.cli = true;
                done(null, true);
            });
        });
    });
};

exports.scan = function (file, done) {
    switch (exports.available.any) {
        case 'tcp':
            return exports.scanTcp(file, done);
        case 'socket':
            return exports.scanSocket(file, done);
        case 'cli':
            return exports.scanBin(file, done);
        default:
            exports.isAvailable(done);
    }
};

exports.scanBin = function (file, done) {
    if (!exports.found.cli) {
        return done('cli not found, did you run binFound yet?');
    }

    var cmd = exports.found.cli + ' -R < ' + file;
    // console.log(cmd);

    child.exec(cmd, function (error, stdout, stderr) {
        // console.log(arguments);
        if (error) {
            // normal when a virus is found.
            // console.log('exec error: ' + error);
        }
        if (stderr) {
            // console.error('stderr: ' + stderr);
            return done(stderr);
        }

        if (!stdout) return done(new Error('no stdout?'));

        // console.log('stdout: ' + stdout);
        return done(null, exports.parseScanReply(stdout));
    });
};

exports.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: 'spamassassin',
        raw: response,
        error: [],
    };

    // console.log(response);
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
        // console.log(match[1]);
        result.fail.push(match[1]);
        return result;
    }

    result.pass.push('ham');
    return result;
};

exports.tcpListening = function (done) {
    var tcpCfg = cfg.spamassassin.network || '0.0.0.0:783';
    var connOpts = {
        port: tcpCfg.split(/:/).pop(),
        host: tcpCfg.split(/:/).shift(),
    };

    findTcp(connOpts, function (err, listening) {
        if (err) return done(err);
        exports.found.tcp = connOpts;
        done(null, connOpts);
    });
};

exports.tcpAvailable = function (done) {
    exports.tcpListening(function (err, listening) {
        if (err) return done(err);

        var socket = new net.Socket();
        socket.setTimeout(5 * 1000);

        exports.ping(socket, exports.found.tcp, function (err, pings) {
            if (err) return done(err);
            exports.available.tcp = pings;
            done(null, pings);
        });
    });
};

exports.socketFound = function (done) {
    var sockFile = cfg.spamassassin.socket || 'spamd.socket';

    findSocket(sockFile, null, function (sockPath) {
        if (!sockPath) return done(new Error(sockFile + ' not found'));
        exports.found.socket = { path: sockPath };
        done(null, exports.found.socket);
    });
};

exports.socketAvailable = function (done) {
    exports.socketFound(function (err, socketPath) {
        if (err) return done(err);

        var socket = new net.Socket();
        socket.setTimeout(5 * 1000);

        exports.ping(socket, exports.found.socket, function (err, pings) {
            if (err) return done(err);
            exports.available.socket = pings;
            done(null, pings);
        });
    });
};

exports.ping = function (socket, connOpts, done) {
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
            console.log('on.close');
            console.error('transmision errors encountered');
        }
    })
    .on('error', function (err) {
        console.log('error');
        done(err);
    });
};

exports.getSpamdHeaders = function (file, done) {
    var filePath = path.resolve(file);

    fs.stat(filePath, function (err, stat) {
        if (err) return done(err);
        // console.log(stat);

        // CHECK - 'SPAMD/1.1 0 EX_OK\r\nSpam: False ; 2.3 / 5.0\r\n\r\n',
        // REPORT - 'SPAMD/1.1 0 EX_OK\r\n',
        // REPORT_IFSPAM
        // SYMBOLS - 'SPAMD/1.1 0 EX_OK\r\nContent-length: 62
        //          Spam: False ; 2.3 / 5.0\r\n
        //          APOSTROPHE_FROM,MISSING_DATE,MISSING_MID,NO_RECEIVED,
        //          NO_RELAYS',
        // HEADERS - SYMBOLS + message headers
        var headers = [
            'SYMBOLS SPAMC/1.5',
            // 'User: matt',
            'Content-length: ' + stat.size,
            // 'Compress: zlib',
        ];

        done(null, headers);
    });
};

exports.scanTcp = function (file, done) {
    if (!exports.found.tcp) {
        return done('TCP listener not found');
    }

    var scanErr = '';
    var socket = exports.getSpamSocket(scanErr, done);

    exports.getSpamdHeaders(file, function (err, headers) {
        var cmd = headers.join('\r\n') + '\r\n\r\n';
        // console.log(cmd);

        socket.connect(exports.found.tcp, function () {
            socket.write(cmd, function () {
                fs.createReadStream(file)
                .pipe(socket)
                .on('end', function () {
                    // console.log('sent file!');
                })
                .on('error', function (err) {
                    console.error(err);
                });
            });
        });
    });
};

exports.scanSocket = function (file, done) {
    if (!file) return done('file is required!');
    if (!exports.found.socket) return done('TCP listener not found');

    var scanErr = '';
    var socket = exports.getSpamSocket(scanErr, done);

    exports.getSpamdHeaders(file, function (err, headers) {
        var cmd = headers.join('\r\n') + '\r\n\r\n';

        socket.connect(exports.found.socket, function () {
            socket.write(cmd, function () {
                fs.createReadStream(file)
                .pipe(socket)
                .on('end', function () {
                    // console.log('sent file!');
                })
                .on('error', function (err) {
                    console.error(err);
                });
            });
        });
    });
};

exports.getSpamSocket = function (scanErr, done) {

    var socket = new net.Socket();
    var calledDone = false;

    socket.setTimeout(cfg.spamassassin.timeout * 1000);
    socket.on('end', function () {
        if (calledDone) return;
        calledDone = true;
        if (scanErr) return done(scanErr);
    })
    .on('data', function (data) {
        socket.end();
        if (calledDone) return;
        calledDone = true;
        done(null, exports.parseScanReply(data.toString()));
    })
    .on('close', function (err) {
        if (err) {
            console.log('on.close');
            console.error('transmision errors encountered');
        }
    })
    .on('error', function (err) {
        console.log('error');
        if (calledDone) return;
        calledDone = true;
        done(err);
    });

    return socket;
};

// sudo launchctl load -w /Library/LaunchDaemons/org.macports.spamd.plist
// sudo launchctl unload -w /Library/LaunchDaemons/org.macports.spamd.plist
