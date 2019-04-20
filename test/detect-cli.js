'use strict';

const assert  = require('assert');
const findBin = require('../lib/detect-cli').findBin;

describe('detect-cli', function () {
    it('finds the bin "which"', function (done) {
        findBin('which', [], (foundBin) => {
            // console.log(foundBin)
            assert.ok(foundBin)
            done()
        })
    })

    it('does not find the bin "does-not-ever-exist"', function (done) {
        findBin('does-not-ever-exist', [], (foundBin) => {
            // console.log(foundBin)
            assert.equal(foundBin, undefined)
            done()
        })
    })
})
