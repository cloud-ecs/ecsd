'use strict';

const assert  = require('assert');
const findBin = require('../lib/detect-cli').findBin;

describe('detect-cli', function () {
    it('finds the bin "which"', async function () {
        assert.ok(await findBin('which', []));
    })

    it('does not find the bin "does-not-ever-exist"', async function () {
        assert.equal(await findBin('does-not-ever-exist', []), undefined);
    })
})
