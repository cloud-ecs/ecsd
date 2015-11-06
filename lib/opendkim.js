'use strict';

var child   = require('child_process');

var cfg     = require('./config').loadConfig();

if (!cfg.opendkim) cfg.opendkim = {};  // in case .ini is missing
if (!cfg.opendkim.timeout) {
    cfg.opendkim.timeout = 30;  // seconds
}

var findBin    = require('./detect-cli').findBin;

exports.found = {
    cli: undefined,
};

exports.isAvailable = false;
exports.available = {
    cli: false,
};

exports.isAvailable = function (done) {
    exports.binAvailable(function (err, bin) {
        if (bin) {
            exports.isAvailable = 'cli';
            return done(null, exports.isAvailable);
        }
        exports.isAvailable = false;
        done(null, exports.isAvailable);
    });
};

exports.binFound = function (done) {
    var bin = cfg.opendkim.cli || 'opendkim';

    findBin(bin, null, function (foundBin) {
        if (!foundBin) return done('not found');
        exports.found.cli = foundBin;
        done(null, foundBin);
    });
};

exports.binAvailable = function (done) {
    exports.binFound(function (err, bin) {
        if (err) return done(err);

        exports.scanBin('test/files/dkim-valid.eml', function (err, results) {
            if (err) return done(err);
            if (results.pass.length === 0) {
                return done('valid sig did not pass');
            }

            exports.scanBin('test/files/dkim-invalid.eml', function (err, res) {
                if (err) return done(err);
                if (res.pass.length) return done('invalid sig passed');
                exports.available.cli = true;
                done(null, true);
            });
        });
    });
};

exports.scan = function (file, done) {
    switch (exports.isAvailable) {
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

    var cmd = exports.found.cli + ' -t ' + file;
    // console.log(cmd);

    child.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            // normal when a virus is found.
            // console.log('exec error: ' + error);
        }

        if (stderr) {
            console.error('stderr: ' + stderr);
            return done(stderr);
        }

        if (!stdout) return done('no stdout?');

        // console.log('stdout: ' + stdout);
        return done(null, exports.parseScannerReply(stdout));
    });
};

exports.parseScannerReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        raw: response,
        error: undefined,
    };

    // console.log(response);
    // 'opendkim: /tmp/clean.eml: message not signed\n'
    // '... verification (s=mar2013, d=tnpi.net, 2048-bit key) succeeded'
    // 'verification (s=mar2013 d=tnpi.net, 2048-bit key, insecure) failed'

    var parts = response.trim().split(/:\s/);

    if (/^verification.*succeeded$/.test(parts[2])) {
        result.pass.push(parts[2]);
        return result;
    }

    result.fail.push(parts[2]);

    return result;
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
    sudo port install opendkim
    */
};

exports.installFreeBSD = function (done) {
    /*
    sudo pkg install -y opendkim
    */
};

exports.installLinux = function (done) {
    /*
    sudo apt-get install -y opendkim
    */
};
