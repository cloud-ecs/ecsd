'use strict';

var assert  = require('assert');
var findTcp = require('../lib/detect-tcp').findTcp;

describe('detect-tcp', function () {

    it.skip('detects a listening port', function (done) {
        findTcp({ port: 3310 }, (err, listening) => {
            assert.ifError(err)
            // console.log(listening);
            assert.ok(listening)
            done()
        })
    })

    it('detects a non-listening port', function (done) {
        findTcp({ port: 3311 }, (err, listening) => {
            assert.ok(err);
            assert.equal(listening, undefined);
            done()
        })
    })
})