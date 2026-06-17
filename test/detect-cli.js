'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const findBin = require('../lib/detect-cli').findBin;

describe('detect-cli', () => {
    it('finds the bin "which"', async () => {
        assert.ok(await findBin('which', []));
    });

    it('does not find the bin "does-not-ever-exist"', async () => {
        assert.equal(await findBin('does-not-ever-exist', []), undefined);
    });
});
