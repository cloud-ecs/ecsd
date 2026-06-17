'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const findTcp = require('../lib/detect-tcp').findTcp;

describe('detect-tcp', () => {

    it.skip('detects a listening port', async () => {
        assert.ok(await findTcp({ port: 3310 }));
    });

    it('detects a non-listening port', async () => {
        await assert.rejects(() => findTcp({ port: 3311 }));
    });
});
