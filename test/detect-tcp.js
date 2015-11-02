'use strict';

var assert  = require('assert');
var findTcp = require('../lib/detect-tcp').findTcp;

describe('detect-tcp', function () {

    it('detects a listening port', function (done) {
        findTcp({ port: 3310 }, function (err, listening) {
            assert.ifError(err);
            // console.log(listening);
            assert.ok(listening);
            done();
        });
    });

    it('detects a non-listening port', function (done) {
        findTcp({ port: 3311 }, function (err, listening) {
            assert.ok(err);
            assert.equal(listening, undefined);
            done();
        });
    });

});