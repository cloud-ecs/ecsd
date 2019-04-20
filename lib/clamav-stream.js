'use strict';

const stream = require('stream');

class clamStream extends stream.Transform {
    constructor (options) {
        super()

        if (!options) options = {};
        stream.Transform.call(this, options);
    }

    _transform (chunk, encoding, done) {
        const size = new Buffer(4)
        size.writeInt32BE(chunk.length, 0)
        this.push(size)
        this.push(chunk)
        done()
    }

    _flush (done) {
        const size = new Buffer(4)
        size.writeInt32BE(0, 0);  // string terminator
        this.push(size)
        done()
    }
}

module.exports = function (options) {
    return new clamStream(options);
};
