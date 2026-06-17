'use strict';

const assert     = require('assert');
const findSocket = require('../lib/detect-socket').findSocket;

describe('detect-socket', function () {

    it.skip('finds clamd.socket', async function () {
        assert.ok(await findSocket('clamd.socket', ['/tmp']));
    })

    it('does not file files that are not sockets', async function () {
        assert.equal(await findSocket('resolv.conf', ['/etc']), undefined);
    })
})
