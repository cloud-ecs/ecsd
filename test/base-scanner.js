'use strict';

const assert = require('assert');

const BaseScanner = require('../lib/base-scanner');
const base = new BaseScanner('base-test');

describe('base-scanner', function () {
    it('exports a function', function (done) {
        assert.equal(typeof BaseScanner, 'function');
        done();
    });

    it('has an init function', function () {
        assert.equal(typeof base.init, 'function');
    });

    it('contains standard properties', function () {
        assert.equal(typeof base.found, 'object');
        assert.equal(typeof base.available, 'object');
    });

    describe('has detect functions', function () {
        it('findBin', function () {
            assert.equal(typeof base.findBin, 'function');
        });

        it('findTcp', function () {
            assert.equal(typeof base.findTcp, 'function');
        });

        it('findSocket', function () {
            assert.equal(typeof base.findSocket, 'function');
        });
    });

    describe('has high-level scanning functions', function () {
        it('isFound', function () {
            assert.equal(typeof base.isFound, 'function');
        });
        it('isAvailable', function () {
            assert.equal(typeof base.isAvailable, 'function');
        });
        it('scan', function () {
            assert.equal(typeof base.scan, 'function');
        });
    });

    describe('has bin scanning functions', function () {
        it('binFound', function () {
            assert.equal(typeof base.binFound, 'function');
        });
        it('binAvailable', function () {
            assert.equal(typeof base.binAvailable, 'function');
        });
        it('scanBin', function () {
            assert.equal(typeof base.scanBin, 'function');
        });
    });

    describe('has TCP scanning functions', function () {
        it('tcpListening', function () {
            assert.equal(typeof base.tcpListening, 'function');
        });
        it('tcpAvailable', function () {
            assert.equal(typeof base.tcpAvailable, 'function');
        });
        it('scanTcp', function () {
            assert.equal(typeof base.scanTcp, 'function');
        });
    });

    describe('has Socket scanning functions', function () {
        it('socketFound', function () {
            assert.equal(typeof base.socketFound, 'function');
        });
        it('socketAvailable', function () {
            assert.equal(typeof base.socketAvailable, 'function');
        });
        it('scanSocket', function () {
            assert.equal(typeof base.scanSocket, 'function');
        });
    });
})
