'use strict';

// node built-ins
var fs        = require('fs');
var path      = require('path');

// npm modules
var ini       = require('ini');

// local modules
var logger    = require('./logger');

exports.loadConfig = function(etcDir) {

    var file = 'cloud-email-scanner.ini';

    var candidates = [ '/etc', './' ];

    if (etcDir && candidates.indexOf(etcDir) === -1) {
        candidates.unshift(etcDir);
    }

    // first readable file path wins
    for (var i = 0; i < candidates.length; i++) {
        var filePath = path.resolve(candidates[i], file);
        try {
            var data = fs.readFileSync(filePath, 'utf-8');
            exports.cfg = ini.parse(data);
            return exports.cfg;
        }
        catch (ignore) {
            // logger.error(ignore.message);
        }
    }
};