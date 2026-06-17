'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const config = require('../lib/config');

describe('cloud-email-scanner', () => {

    describe('loadConfig', () => {
        it('has loadConfig function', () => {
            assert.equal(typeof config.loadConfig, 'function');
        });

        it('finds cloud-email-scanner.ini', () => {
            assert.ok(config.loadConfig());
        });

        it('config has expected sections', () => {
            config.loadConfig();
            for (const s of ['clamav', 'spamassassin', 'esets']) {
                assert.ok(config.cfg[s]);
            }
        });
    });

    describe('deepMerge (config layering)', () => {
        it('overrides scalars and merges nested sections', () => {
            const base = { a: 1, net: { host: '0.0.0.0', port: '3310' } };
            const over = { a: 2, net: { host: '10.0.1.180' } };
            const out = config.deepMerge(base, over);
            assert.equal(out.a, 2);
            assert.equal(out.net.host, '10.0.1.180');
            assert.equal(out.net.port, '3310');
        });

        it('does not mutate the base layer', () => {
            const base = { net: { host: '0.0.0.0' } };
            config.deepMerge(base, { net: { host: 'x' } });
            assert.equal(base.net.host, '0.0.0.0');
        });
    });
});
