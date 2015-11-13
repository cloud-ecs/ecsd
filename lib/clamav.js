'use strict';

var child   = require('child_process');
var fs      = require('fs');
var net     = require('net');
var path    = require('path');

var cfg     = require('./config').loadConfig();
var logger  = require('./logger');

if (!cfg.clamav) cfg.clamav = {};  // in case .ini is missing
if (!cfg.clamav.timeout) {
    cfg.clamav.timeout = 30;  // seconds
}

var findBin    = require('./detect-cli').findBin;
var findTcp    = require('./detect-tcp').findTcp;
var findSocket = require('./detect-socket').findSocket;
var clamStream = require('./clamav-stream');

var virusFile  = path.resolve('test/files/eicar.eml');
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
    var bin = cfg.clamav.cli || 'clamdscan';

    findBin(bin, null, function (clamBin) {
        if (!clamBin) {
            return done(new Error(bin + ' not found'));
        }
        exports.found.cli = clamBin;
        done(null, clamBin);
    });
};

exports.binAvailable = function (done) {
    exports.binFound(function (err, bin) {
        if (err) return done(err);

        exports.scanBin(virusFile, function (err, results) {
            if (err) return done(err);
            if (!results.fail.length) {
                return done(new Error('virus detection failed'));
            }

            exports.scanBin(cleanFile, function (err, results) {
                if (err) return done(err);
                if (results.fail.length) {
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

    var cmd = exports.found.cli + ' ' + file;
    // logger.info(cmd);

    child.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            // normal when a virus is found.
            // logger.error('exec error: ' + error);
        }
        if (stderr) {
            logger.error('stderr: ' + stderr);
            return done(stderr);
        }

        if (!stdout) return done('no stdout?');

        // logger.info('stdout: ' + stdout);
        return done(null, exports.parseClamReply(stdout));
    });
};

exports.parseClamReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        error: [],
        name: 'clamav',
        raw: response,
    };

    // logger.info(response);
    // Example responses from clamdscan & clamd
    // /tmp/clean.eml: OK
    // /tmp/eicar.eml: Eicar-Test-Signature FOUND
    // stream: Eicar-Test-Signature FOUND

    var lineOne = response.split(/[\r\n]/).shift();

    if (/OK[\0|\n]?$/.test(lineOne)) {
        result.pass.push('OK');
        return result;
    }

    if (/FOUND[\0|\n]?$/.test(lineOne)) {
        var parts = lineOne.split(/:\s/);
        result.fail.push(parts[1].split(/\s/).shift());
        return result;
    }

    if (/ERROR/.test(response)) {
        result.error.push(response);
    }

    return result;
};

exports.tcpListening = function (done) {
    var tcpCfg = cfg.clamav.network || '0.0.0.0:3310';
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
    var sockFile = cfg.clamav.socket || 'clamd.socket';

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

    socket.connect(connOpts, function () {
        socket.write('nPING\n');
    })
    .on('end', function () {
        if (pingErr) return done(pingErr);
        done(null, true);
    })
    .on('data', function (data) {
        if (data.toString() === 'PONG\n') {
            return socket.end();
        }
        pingErr = new Error('unexpected: ' + data.toString());
        socket.end();
    })
    .on('close', function (err) {
        if (err) {
            logger.error('on.close');
            logger.error(err);
            logger.error('transmision errors encountered');
        }
    })
    .on('error', function (err) {
        logger.error('error');
        done(err);
    });
};

exports.scanTcp = function (file, done) {
    if (!exports.found.tcp) {
        return done('TCP listener not found');
    }

    var scanErr = '';
    var socket = exports.getClamSocket(scanErr, done);

    socket.connect(exports.found.tcp, function () {
        socket.write('zINSTREAM\0', function () {
            fs.createReadStream(file)
            .pipe(new clamStream()).pipe(socket)
            .on('end', function () {
                // logger.info('sent file!');
            })
            .on('error', function (err) {
                logger.error(err);
            });
        });
    });
};

exports.scanSocket = function (file, done) {
    if (!file) return done('file is required!');
    if (!exports.found.socket) {
        return done(new Error('TCP listener not found'));
    }

    var scanErr = '';
    var socket = exports.getClamSocket(scanErr, done);

    socket.connect(exports.found.socket, function () {
        if (typeof file === 'string' && file[0] !== '/') {
            file = path.resolve(file);
        }
        socket.write('SCAN ' + file);
    });
};

exports.getClamSocket = function (scanErr, done) {

    var socket = new net.Socket();

    socket.setTimeout(cfg.clamav.timeout * 1000);
    socket.on('end', function () {
        if (scanErr) return done(scanErr);
    })
    .on('data', function (data) {
        socket.end();
        done(null, exports.parseClamReply(data.toString()));
    })
    .on('close', function (err) {
        if (err) {
            logger.error('on.close');
            logger.error(err);
            logger.error('transmision errors encountered');
        }
    })
    .on('error', function (err) {
        logger.error('error');
        done(err);
    });

    return socket;
};

exports.install = function (done) {
    switch (process.platform) {
        case 'darwin':
            return this.installMacOSX(done);
        case 'freebsd':
            return this.installFreeBSD(done);
        case 'linux':
            return this.installLinux(done);
        default:
            done('install not supported on ' + process.platform);
    }
};

exports.installMacOSX = function (done) {
    /*
    sudo port install clamav clamav-servers
    sudo launchctl load -w /Library/LaunchDaemons/org.macports.freshclam.plist
    sudo launchctl load -w /Library/LaunchDaemons/org.macports.clamd.plist
    */
};

exports.installFreeBSD = function (done) {
    /*
    sudo pkg install -y clamav
    echo 'clamav_freshclam_enable="YES"' | sudo tee -a /etc/rc.conf -
    echo 'clamav_clamd_enable="YES"' | sudo tee -a /etc/rc.conf -
    sudo service clamav-freshclam start
    sudo service clamav-clamd start
    */
};

exports.installLinux = function (done) {
    /*
    sudo apt-get install -y clamav-daemon clamav-freshclam libclamunrar6
    */
};
