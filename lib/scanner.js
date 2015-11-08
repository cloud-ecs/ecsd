'use strict';

var path     = require('path');
var util     = require('util');

var formidable = require('formidable');

var cfg      = require('./config').loadConfig();
var spoolDir = path.resolve(cfg.spool.dir);

exports.availableScanners = {};

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

        console.log(files);
        Object.keys(files).forEach(function (f) {
            res.write(util.inspect(files[f]));
        });

        res.end(util.inspect({ fields: fields }));
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

// setTimeout(function () {
//     exports.testScanner();
// }, 120 * 1000); // ever 2 min...

[   'spamassassin', 'rspamd', 'dspam',
    'messagesniffer', 'dcc', 'virustotal',
    'clamav', 'avg', 'eset', 'kaspersky', 'comodo', 'bitdefender',
    'opendkim', 'opendmarc'
]
.forEach(exports.testScanner);
