'use strict';

var child   = require('child_process');
var fs      = require('fs');
var net     = require('net');
var path    = require('path');
var lmtp    = require('smtp-connection');

var cfg     = require('./config').loadConfig();

if (!cfg.dspam) cfg.dspam = {};  // in case .ini is missing
if (!cfg.dspam.timeout) {
    cfg.dspam.timeout = 30;  // seconds
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

exports.isFound = function (done) {
    exports.binFound(function (err, bin) {
        if (bin) {
            exports.found.any = 'cli';
            return done(null, exports.found.any);
        }
        exports.socketFound(function (err, sock) {
            if (sock) {
                exports.found.any = 'socket';
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
    exports.binAvailable(function (err, bin) {
        if (bin) {
            exports.available.any = 'cli';
            return done(null, exports.available.any);
        }
        exports.socketAvailable(function (err, sock) {
            if (sock) {
                exports.available.any = 'socket';
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
    var binName = cfg.dspam.cli || 'dspam';

    findBin(binName, null, function (bin) {
        if (!bin) {
            return done(new Error(binName + ' not found'));
        }
        exports.found.cli = bin;
        done(null, bin);
    });
};

exports.binAvailable = function (done) {
    exports.binFound(function (err, bin) {
        if (err) return done(err);

        exports.scanBin(spamFile, function (err, results) {
            if (err) return done(err);
            // if (!results.spam) {
                // return done(new Error('spam detection failed'));
            // }

            exports.scanBin(cleanFile, function (err, results) {
                if (err) return done(err);
                if (results.spam) {
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

    var cmd = exports.found.cli +
        ' --mode=tum --process --deliver=summary --stdout < ' + file;
    // console.log(cmd);

    child.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.log('exec error: ' + error);
        }
        if (stderr) {
            console.error('stderr: ' + stderr);
            return done(stderr);
        }

        if (!stdout) return done('no stdout?');

        // console.log('stdout: ' + stdout);
        return done(null, exports.parseResponse(stdout));
    });
};

exports.parseResponse = function (response) {

    var result = {
        spam: false,
        name: '',
        raw: response,
        error: undefined,
    };

    // console.log(response);

    if (typeof response === 'object') {
        result.raw = response.response;
        if (response.rejected.length > 0) result.spam = true;
        return result;
    }

    // X-DSPAM-Result: matt; result="Innocent"; class="Innocent"; probability=0.0023;
    //     confidence=1.00; signature=56419144723296644318707
    var parts = response.split(/; /);
    // console.log(parts);
    result.name = parts[5].split(/=/).pop().trim();
    result.spam = parts[1].split(/=/).pop() === '"Innocent"' ? false : true;
    return result;
};

exports.tcpListening = function (done) {
    var tcpCfg = cfg.dspam.network || '0.0.0.0:24';
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
    var sockFile = cfg.dspam.socket || 'dspam.sock';

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

exports.scanTcp = function (file, done) {
    if (!exports.found.tcp) {
        return done('TCP listener not found');
    }

    var connection = new lmtp({
            lmtp: true,
            port: exports.found.tcp.port,
            host: exports.found.tcp.host,
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
                done(err, exports.parseResponse(res));
            });
        });
    });
};

exports.scanSocket = function (file, done) {
    if (!file) return done('file is required!');
    if (!exports.found.socket) {
        return done(new Error('TCP listener not found'));
    }

    var connection = new lmtp({
            lmtp: true,
            socket: exports.found.socket.path,
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
                done(err, exports.parseResponse(res));
            });
        });
    });
};
