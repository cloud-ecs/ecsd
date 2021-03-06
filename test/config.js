'use strict';

const assert  = require('assert');

const config  = require('../lib/config');

describe('cloud-email-scanner', function () {

    describe('loadConfig', function () {
        it('has loadConfig function', function (done) {
            assert.equal(typeof config.loadConfig, 'function');
            done();
        })

        it('finds cloud-email-scanner.ini', function (done) {
            const cfg = config.loadConfig();
            assert.ok(cfg);
            done();
        })

        it('config has expected sections', function (done) {
            config.loadConfig();
            ['clamav', 'spamassassin', 'esets'].forEach(function (s) {
                assert.ok(config.cfg[s]);
            });
            done();
        })
    })
})
