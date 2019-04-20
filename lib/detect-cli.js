'use strict';

const fs    = require('fs');
const path  = require('path');

const async = require('async');

const defaultBinDirs = [
    '/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin',
    '/usr/local/sbin', '/opt/local/bin', '/opt/local/sbin'
];

exports.findBin = function (bin, dirs, done) {
    if (!bin) {
        return done(Error('missing "bin" argument'));
    }
    if (!dirs || dirs.length === 0) {
        dirs = defaultBinDirs;
    }

    const paths = [];
    for (let i = 0; i < dirs.length; i++) {
        paths.push(path.resolve(dirs[i], bin));
    }

    async.detectSeries(paths, isExecutable, function (foundDir) {
        if (!foundDir) return done();
        done(foundDir);
    });
};

function isExecutable (filePath, done) {
    if (!filePath) return done(false);

    fs.access(filePath, fs.X_OK, function (err) {
        if (err) return done(false);
        done(true);
    });
}