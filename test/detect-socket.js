'use strict';

var assert     = require('assert');
var findSocket = require('../lib/detect-socket').findSocket;

describe('detect-socket', function () {

    it('finds clamd.socket', function (done) {
        findSocket('clamd.socket', ['/tmp'], function (socketFile) {
            // console.log(socketFile);
            assert.ok(socketFile);
            done();
        });
    });

    it('does not file files that are not sockets', function (done) {
        findSocket('resolv.conf', ['/etc'], function (socketFile) {
            assert.equal(socketFile, undefined);
            done();
        });
    });
});