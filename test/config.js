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
});
