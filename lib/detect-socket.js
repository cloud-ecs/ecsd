'use strict';

const fs    = require('fs');
const path  = require('path');

const async = require('async');

const defaultSocketDirs = [
    '/tmp',             // Mac OS X (macports)
    '/var/run',         // FreeBSD ports
];

exports.findSocket = function (fileName, dirs, done) {
    if (!fileName) {
        throw Error('missing "fileName" argument');
    }
    if (!dirs || dirs.length === 0) {
        dirs = defaultSocketDirs;
    }

    const paths = [];
    for (let i = 0; i < dirs.length; i++) {
        paths.push(path.resolve(dirs[i], fileName));
    }

    async.detectSeries(paths, isSocket, function (foundDir) {
        if (!foundDir) return done();
        done(foundDir);
    });
};

function isSocket (filePath, done) {
    fs.stat(filePath, function (err, stats) {
        if (err) return done(false);
        done(stats.isSocket());
    });
}
