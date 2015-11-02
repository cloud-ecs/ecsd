'use strict';

var stream = require('stream');
var util   = require('util');

function clamStream (options) {
    if (!options) options = {};
    stream.Transform.call(this, options);
}

util.inherits(clamStream, stream.Transform);

clamStream.prototype._transform = function(chunk, encoding, done) {
    var size = new Buffer(4);
    size.writeInt32BE(chunk.length, 0);
    this.push(size);
    this.push(chunk);
    done();
};

clamStream.prototype._flush = function (done) {
    var size = new Buffer(4);
    size.writeInt32BE(0, 0);  // string terminator
    this.push(size);
    done();
};

module.exports = function (options) {
    return new clamStream(options);
};
