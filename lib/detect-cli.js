'use strict';

var fs    = require('fs');
var path  = require('path');

var async = require('async');

var defaultBinDirs = [
    '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin',
    '/usr/local/sbin', '/opt/local/bin', '/opt/local/sbin'
];

exports.findBin = function (bin, dirs, done) {
    if (!bin) {
        throw Error('missing "bin" argument');
    }
    if (!dirs || dirs.length === 0) {
        dirs = defaultBinDirs;
    }

    var paths = [];
    for (var i = 0; i < dirs.length; i++) {
        paths.push(path.resolve(dirs[i], bin));
    }

    async.detectSeries(paths, isExecutable, function (foundDir) {
        if (!foundDir) return done();
        done(foundDir);
    });
};

function isExecutable (filePath, done) {
    fs.access(filePath, fs.X_OK, function (err) {
        if (err) return done(false);
        done(true);
    });
}