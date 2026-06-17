'use strict';

const net = require('net');

let connectTimeout = 3;
if (process.env.NODE_ENV === 'test') connectTimeout = 1;

exports.findTcp = function (connOpts, done) {
    if (!connOpts.port) throw Error('missing "port" argument');

    let calledDone = false;
    function doneOnce (err, success) {
        if (calledDone) return
        calledDone = true
        done(err, success)
    }

    const timer = setTimeout(function () {
        doneOnce(new Error('timed out'));
    },
    connectTimeout * 1000)

    net.connect(connOpts)
    .on('connect', () => {
        clearTimeout(timer)
        doneOnce(null, true);
    })
    .on('error', (err) => {
        clearTimeout(timer)
        doneOnce(err)
    })
}
