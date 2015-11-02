'use strict';

var path     = require('path');
var util     = require('util');

var formidable = require('formidable');

var cfg      = require('./config').loadConfig();

exports.post = function (req, res) {

    var form = new formidable.IncomingForm();
    form.uploadDir = path.resolve(cfg.spool.dir);
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