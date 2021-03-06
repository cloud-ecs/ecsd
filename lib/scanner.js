'use strict';

const path     = require('path');

const async      = require('async');
const formidable = require('formidable');

const logger   = require('./logger');
const cfg      = require('./config').loadConfig();
const spoolDir = path.resolve(cfg.spool.dir);

exports.scanners = [
    'spamassassin', 'rspamd', 'dspam',
    'messagesniffer', 'dcc', 'virustotal', 'fprot', 'f-secure',
    'clamav', 'avg', 'eset', 'kaspersky', 'comodo', 'bitdefender',
    'opendkim', 'opendmarc'
];

exports.availableScanners = {};

exports.scanFns = {};

exports.testScanner = function (s) {
    try {
        const t = require('./' + s).createScanner();
        t.isAvailable(function (err, avail) {
            if (err) return;
            if (!avail) {
                logger.error('not available: ' + s);
                return;
            }
            exports.availableScanners[s] = t;
        });
    }
    catch (e) {
        logger.error('could not load: ' + s);
    }
};

exports.post = function (req, res) {

    const form = new formidable.IncomingForm();
    form.uploadDir = spoolDir;
    form.keepExtensions = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            logger.error(err);
            return;
        }

        const filenames = [];
        Object.keys(files).forEach(function (f) {
            filenames.push(files[f].path);
        });

        // logger.info(files);
        const doThese = [];
        Object.keys(exports.availableScanners).forEach(function (s) {
            doThese.push(function (cb) {
                exports.availableScanners[s].scan(filenames[0],
                    function (err, res) {
                        if (err) {
                            logger.error(err);
                            return;
                        }
                        // logger.info(res);
                        cb(null, res);
                    });
            });
        });

        async.parallel(doThese, function (err, results) {
            if (err) {
                logger.error(err);
                res.json({ err: err });
                return;
            }
            res.json(results);
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
