'use strict';

// var child   = require('child_process');
var fs      = require('fs');
var http    = require('http');
var path    = require('path');
var util    = require('util');

var logger  = require('./logger');
var BaseScanner = require('./base-scanner');

function Scanner (name) {
    BaseScanner.call(this);

    this.name = name || 'rspamd';

    this.init();

    if (!this.cfg.socket)   this.cfg.socket   = 'rspamd.socket';
    if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'rspamc';
    if (!this.cfg.cli.args) this.cfg.cli.args = ' -R < ';
    if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0';
    if (!this.cfg.net.port) this.cfg.net.port = '11333';

    this.failFile = path.resolve('test/files/gtube.eml');
    this.passFile = path.resolve('test/files/clean.eml');

    logger.debug(util.inspect(this, { depth: null }));
}

util.inherits(Scanner, BaseScanner);

Scanner.prototype.ping = function(done) {
    var s = this;

    var httpOpts = {
        host: s.cfg.net.host,
        port: s.cfg.net.port,
        path: '/scan',
        method: 'POST',
        headers: {},
    };

    var rawResponse = '';
    var req = http.request(httpOpts, function (res) {
        // console.log('STATUS: ' + res.statusCode);
        // console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            rawResponse += chunk;
        });
        res.on('end', function() {
            logger.debug(rawResponse);
            done(null, true);
        });
    });

    req.on('error', function (err) {
        logger.error(err);
        done(err);
    });
    req.end();
};

Scanner.prototype.parseScanReply = function (response) {

    var result = {
        pass: [],
        fail: [],
        name: this.name,
        api: this.available.any,
        raw: response,
        error: [],
    };

    // logger.info(response);

    try {
        var parsed = JSON.parse(response);
        if (!parsed) return result;
        if (parsed.default.is_spam === true) {
            result.fail.push(parsed.default.score);
        }
        else if (parsed.default.is_spam === false) {
            result.pass.push(parsed.default.score);
        }
    }
    catch (e) {
        console.error(e);
    }
    // logger.info(parsed);

    return result;
};

Scanner.prototype.tcpAvailable = function (done) {
    var s = this;
    s.ping(function (err, pings) {
        if (err) return done(err);
        s.available.tcp = pings;
        done(err, pings);
    });
};

Scanner.prototype.scanTcp = function (file, done) {
    var s = this;
    if (!s.available.tcp) return done(new Error('TCP listener not found'));

    // https://rspamd.com/doc/architecture/protocol.html
    var httpOpts = {
        host: s.cfg.net.host,
        port: s.cfg.net.port,
        path: '/check',
        method: 'POST',
        headers: {
            // 'Deliver-To':
            // Ip:
            // Helo:
            // Hostname:
            // From:
            // 'Queue-Id':
            // Rcpt:
            Pass: 'all',
            // Subject:
            // User:
            // Message-Length:
        },
    };

    var req;
    var rawResponse = '';

    var filePath = path.resolve(file);
    fs.stat(filePath, function (err, stat) {
        if (err) return done(err);

        httpOpts.headers['Message-Length'] = stat.size;

        fs.createReadStream(filePath).pipe(
            req = http.request(httpOpts, function (res) {
                // console.log('STATUS: ' + res.statusCode);
                // console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    rawResponse += chunk;
                });
                res.on('end', function() {
                    done(null, s.parseScanReply(rawResponse));
                });
            })
        );

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            done(e);
        });
    });
};

module.exports = {
    createScanner: function (name) {
        return new Scanner(name);
    }
};
