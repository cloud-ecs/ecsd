'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const findTcp = require('../lib/detect-tcp').findTcp;

describe('detect-tcp', () => {

    it.skip('detects a listening port', async () => {
        const listening = await new Promise((resolve, reject) =>
            findTcp({ port: 3310 }, (err, res) => (err ? reject(err) : resolve(res))));
        assert.ok(listening);
    });

    it('detects a non-listening port', async () => {
        const { err, listening } = await new Promise((resolve) =>
            findTcp({ port: 3311 }, (err, listening) => resolve({ err, listening })));
        assert.ok(err);
        assert.equal(listening, undefined);
    });
});
