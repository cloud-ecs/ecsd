'use strict';

// node built-ins
const fs        = require('fs');
const path      = require('path');

// npm modules
const ini       = require('ini');

// local modules
const logger    = require('./logger');

exports.loadConfig = function(etcDir) {

    const file = 'cloud-email-scanner.ini';

    const candidates = [ '/etc', './' ];

    if (etcDir && candidates.indexOf(etcDir) === -1) {
        candidates.unshift(etcDir);
    }

    // first readable file path wins
    for (let i = 0; i < candidates.length; i++) {
        const filePath = path.resolve(candidates[i], file);
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            exports.cfg = ini.parse(data);
            return exports.cfg;
        }
        catch (ignore) {
            logger.debug(ignore.message);
        }
    }
};
