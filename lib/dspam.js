'use strict';

const fs      = require('fs');
const net     = require('net');
const path    = require('path');
const lmtp    = require('smtp-connection');

const logger  = require('./logger');

const BaseScanner = require('./base-scanner');

class Scanner extends BaseScanner {
    constructor (name) {
        super()

        this.name = name || 'dspam';

        this.init()

        if (!this.cfg.socket)   this.cfg.socket   = 'dspam.sock'
        if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'dspam'
        if (!this.cfg.cli.args) {
            this.cfg.cli.args = '--mode=tum --process --deliver=summary --stdout <'
        }
        if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
        if (!this.cfg.net.port) this.cfg.net.port = '24'

        this.failFile = path.resolve('test/files/gtube.eml')
        this.passFile = path.resolve('test/files/clean.eml')

        // logger.info(util.inspect(this, { depth: null }));
    }

    isFound (done) {
        this.binFound((err, bin) => {
            if (err) logger.error(err);
            if (bin) {
                this.found.any = 'cli';
                return done(null, this.found.any);
            }
            this.socketFound((err, sock) => {
                if (err) logger.error(err);
                if (sock) {
                    this.found.any = 'socket';
                    return done(null, this.found.any);
                }
                this.tcpListening((err, sock) => {
                    if (err) logger.error(err);
                    if (sock) {
                        this.found.any = 'tcp';
                        return done(null, this.found.any);
                    }
                    this.found.any = false;
                    done(null, this.found.any);
                })
            })
        })
    }

    isAvailable (done) {
        this.binAvailable((err, bin) => {
            if (bin) {
                this.available.any = 'cli';
                return done(null, this.available.any);
            }
            this.socketAvailable((err, sock) => {
                if (sock) {
                    this.available.any = 'socket';
                    return done(null, this.available.any);
                }
                this.tcpAvailable((err, sock) => {
                    if (sock) {
                        this.available.any = 'tcp';
                        return done(null, this.available.any);
                    }
                    this.available.any = false;
                    done(null, this.available.any);
                })
            })
        })
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        }

        // console.log(response);

        if (typeof response === 'object') {
            result.raw = response.response;
            if (response.rejected.length > 0) {
                result.fail.push(response.rejected);
                return result;
            }
            result.pass.push(response.accepted[0]);
            return result;
        }

        // X-DSPAM-Result: matt; result="Innocent"; class="Innocent"; probability=0.0023;
        //     confidence=1.00; signature=56419144723296644318707
        const parts = response.split(/; /);
        const sig = parts[5].split(/=/).pop().trim();
        if (parts[1].split(/=/).pop() === '"Innocent"') {
            result.pass.push(sig)
            return result
        }

        result.fail.push(sig)
        return result
    }

    ping (socket, connOpts, done) {
        var pingErr;

        if (!socket) {
            socket = new net.Socket();
            socket.setTimeout(5 * 1000);
        }

        socket.connect(connOpts, () => {
            socket.write('LHLO\r\n');
        })
        .on('end', () => {
            if (pingErr) return done(pingErr);
            done(null, true);
        })
        .on('data', (data) => {
            if (/DSPAM LMTP [0-9.]+ Ready/.test(data.toString())) {
                socket.write('QUIT\r\n');
                // return socket.end();
            }
            // pingErr = new Error('unexpected: ' + data.toString());
            // socket.end();
        })
        .on('close', (err) => {
            if (err) {
                console.log('on.close');
                console.error('transmission errors encountered');
            }
        })
        .on('error', (err) => {
            console.log('error');
            done(err);
        })
    }

    scanTcp (file, done) {
        if (!this.found.tcp) {
            return done(new Error('TCP listener not found'));
        }

        const connection = new lmtp({
            lmtp: true,
            port: this.cfg.net.port,
            host: this.cfg.net.host,
        })

        connection
        .on('error', (err) => {
            console.error(err)
            done(err)
        })

        fs.readFile(file, (err, data) => {
            if (err) console.error(err);
            // console.log(data.toString());
            const envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };
            // TODO: get this via request
            connection.connect(() => {
                connection.send(envelope, data.toString(), (err, res) => {
                    if (err) return done(err);
                    done(err, this.parseScanReply(res));
                })
            })
        })
    }

    scanSocket (file, done) {
        if (!file) return done(new Error('file is required!'));
        if (!this.found.socket) {
            return done(new Error('TCP listener not found'));
        }

        const connection = new lmtp({
            lmtp: true,
            socket: this.found.socket.path,
        })

        connection
        .on('error', (err) => {
            console.error(err);
            done(err);
        })

        fs.readFile(file, (err, data) => {
            if (err) console.error(err);

            const envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };

            // TODO: get this via request
            connection.connect(() => {
                connection.send(envelope, data.toString(), (err, res) => {
                    if (err) return done(err);
                    done(err, this.parseScanReply(res));
                })
            })
        })
    }
}

module.exports = {
    createScanner: function (name) {
        return new Scanner(name)
    }
}
