'use strict';

const fs        = require('node:fs');
const path      = require('node:path');

const ini       = require('ini');

const logger    = require('./logger');

const BASENAME = 'cloud-email-scanner';

// Config is layered, lowest precedence first; each layer is deep-merged over
// the previous:
//   1. cloud-email-scanner.ini            committed defaults
//   2. cloud-email-scanner.<ECSD_ENV>.ini per-environment (e.g. ci, production)
//   3. cloud-email-scanner.local.ini      personal overrides (gitignored)
// Per-service defaults (host/port/...) live in each scanner's constructor, so a
// layer only needs to set what it changes. Layers are looked up in the caller's
// dir, then the cwd, then /etc; the first dir that has a given layer wins.

function isObject (val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function deepMerge (base, override) {
    const out = { ...base };
    for (const [key, val] of Object.entries(override)) {
        out[key] = isObject(val) && isObject(out[key])
            ? deepMerge(out[key], val)
            : val;
    }
    return out;
}

function readLayer (dirs, name) {
    for (const dir of dirs) {
        try {
            return ini.parse(fs.readFileSync(path.resolve(dir, name), 'utf-8'));
        }
        catch (err) {
            if (err.code !== 'ENOENT') logger.error(err.message);
        }
    }
    return null;
}

exports.loadConfig = function (etcDir) {
    const dirs = [etcDir, process.cwd(), '/etc'].filter(Boolean);

    const env = process.env.ECSD_ENV;
    const layers = [
        `${BASENAME}.ini`,
        env && `${BASENAME}.${env}.ini`,
        `${BASENAME}.local.ini`,
    ].filter(Boolean);

    let cfg;
    for (const name of layers) {
        const data = readLayer(dirs, name);
        if (data) cfg = cfg ? deepMerge(cfg, data) : data;
    }

    exports.cfg = cfg;
    return cfg;
};

exports.deepMerge = deepMerge;
