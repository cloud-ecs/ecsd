'use strict';

var path     = require('path');
var util     = require('util');

var async      = require('async');
var formidable = require('formidable');

var cfg      = require('./config').loadConfig();
var spoolDir = path.resolve(cfg.spool.dir);

exports.scanners = [
    'spamassassin', 'rspamd', 'dspam',
    'messagesniffer', 'dcc', 'virustotal',
    'clamav', 'avg', 'eset', 'kaspersky', 'comodo', 'bitdefender',
    'opendkim', 'opendmarc'
];

exports.availableScanners = {};

exports.scanFns = {};

exports.testScanner = function (s) {
    try {
        var t = require('./' + s);
        t.isAvailable(function (err, avail) {
            if (err) return;
            if (!avail) {
                console.error('not available: ' + s);
                return;
            }
            exports.availableScanners[s] = t;
        });
    }
    catch (e) {
        console.error('could not load: ' + s);
    }
};

exports.post = function (req, res) {

    var form = new formidable.IncomingForm();
    form.uploadDir = spoolDir;
    form.keepExtensions = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            console.error(err);
            return;
        }

        res.writeHead(200, { 'content-type': 'text/plain' });
        res.write('received upload:\n\n');

        var filenames = [];
        Object.keys(files).forEach(function (f) {
            filenames.push(files[f].path);
        });

        // console.log(files);
        var doThese = [];
        Object.keys(exports.availableScanners).forEach(function (s) {
            doThese.push(function (cb) {
                exports.availableScanners[s].scan(filenames[0], function (err, res) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log(res);
                    cb(null, res);
                });
            });
        });

        async.parallel(doThese, function (err, results) {
            if (err) {
                console.error(err);
                res.end(err);
                return;
            }
            res.end(util.inspect(results, { depth: null }));
        });
    });
};

exports.get = function (req, res) {

    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
        '<form action="/scan" enctype="multipart/form-data" method="post">'+
        '<input type="text" name="title"><br>'+
        '<input type="file" name="upload" multiple="multiple"><br>'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
};

exports.listAll = function (req, res) {
    res.json({ scanners: exports.scanners });
};

exports.listAvailable = function (req, res) {
    res.json({ scanners: exports.availableScanners });
};

exports.scanners.forEach(exports.testScanner);

// every 2 minutes, test availability of the scanners
setInterval(function () {
    exports.scanners.forEach(exports.testScanner);
}, 120 * 1000); // every 2 min, forever
