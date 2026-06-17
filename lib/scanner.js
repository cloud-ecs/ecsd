'use strict';

const path     = require('node:path');

const { formidable } = require('formidable');

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

    const form = formidable({
        uploadDir: spoolDir,
        keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            logger.error(err);
            return;
        }

        const uploaded = Object.values(files)[0];
        if (!uploaded) {
            res.status(400).json({ err: 'no file uploaded' });
            return;
        }

        const file = uploaded[0].filepath;
        const scanners = Object.values(exports.availableScanners);

        try {
            const results = await Promise.all(
                scanners.map((scanner) => scanOne(scanner, file))
            );
            res.json(results);
        }
        catch (e) {
            logger.error(e);
            res.json({ err: e.message });
        }
    });
};

function scanOne (scanner, file) {
    return new Promise((resolve) => {
        scanner.scan(file, (err, result) => {
            if (err) {
                logger.error(err);
                return resolve(null);
            }
            resolve(result);
        });
    });
}

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

// re-test scanner availability every 2 minutes; unref so it never keeps a
// short-lived process (e.g. the test runner) alive on its own
setInterval(function () {
    exports.scanners.forEach(exports.testScanner);
}, 120 * 1000).unref();
