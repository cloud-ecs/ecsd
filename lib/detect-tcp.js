'use strict';

var net = require('net');

exports.findTcp = function (connOpts, done) {
    if (!connOpts.port) {
        throw Error('missing "port" argument');
    }

    var client = net.connect(connOpts, function () {
        // console.log('client connected');
        client.end();
        done(null, true);
    })
    .on('error', function (err) {
        // console.error(err);
        done(err);
    });
};
