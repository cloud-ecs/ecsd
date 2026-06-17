'use strict';

const fs      = require('node:fs');
const net     = require('node:net');
const path    = require('node:path');

// optional LMTP transport; only present if smtp-connection is installed
let lmtp;
try {
    lmtp = require('smtp-connection');
}
catch {
    lmtp = null;
}

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
    }

    async isFound () {
        try {
            if (await this.binFound()) {
                this.found.any = 'cli';
                return this.found.any;
            }
        }
        catch (err) { logger.error(err); }

        try {
            if (await this.socketFound()) {
                this.found.any = 'socket';
                return this.found.any;
            }
        }
        catch (err) { logger.error(err); }

        try {
            if (await this.tcpListening()) {
                this.found.any = 'tcp';
                return this.found.any;
            }
        }
        catch (err) { logger.error(err); }

        this.found.any = false;
        return this.found.any;
    }

    async isAvailable () {
        try {
            if (await this.binAvailable()) {
                this.available.any = 'cli';
                return this.available.any;
            }
        }
        catch { /* try the next transport */ }

        try {
            if (await this.socketAvailable()) {
                this.available.any = 'socket';
                return this.available.any;
            }
        }
        catch { /* try the next transport */ }

        try {
            if (await this.tcpAvailable()) {
                this.available.any = 'tcp';
                return this.available.any;
            }
        }
        catch { /* none available */ }

        this.available.any = false;
        return this.available.any;
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        }

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

    ping (socket, connOpts) {
        return new Promise((resolve, reject) => {
            if (!socket) {
                socket = new net.Socket();
                socket.setTimeout(5 * 1000);
            }

            socket.connect(connOpts, () => {
                socket.write('LHLO\r\n');
            })
            .on('end', () => {
                resolve(true);
            })
            .on('data', (data) => {
                if (/DSPAM LMTP [0-9.]+ Ready/.test(data.toString())) {
                    socket.write('QUIT\r\n');
                }
            })
            .on('close', (err) => {
                if (err) {
                    console.log('on.close');
                    console.error('transmission errors encountered');
                }
            })
            .on('error', (err) => {
                console.log('error');
                reject(err);
            })
        })
    }

    async scanTcp (file) {
        if (!lmtp) throw new Error('smtp-connection not installed');
        if (!this.found.tcp) throw new Error('TCP listener not found');

        const data = await fs.promises.readFile(file);

        return new Promise((resolve, reject) => {
            const connection = new lmtp({
                lmtp: true,
                port: this.cfg.net.port,
                host: this.cfg.net.host,
            })

            connection.on('error', reject)

            const envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };
            connection.connect(() => {
                connection.send(envelope, data.toString(), (err, res) => {
                    if (err) return reject(err);
                    resolve(this.parseScanReply(res));
                })
            })
        })
    }

    async scanSocket (file) {
        if (!lmtp) throw new Error('smtp-connection not installed');
        if (!file) throw new Error('file is required!');
        if (!this.found.socket) throw new Error('TCP listener not found');

        const data = await fs.promises.readFile(file);

        return new Promise((resolve, reject) => {
            const connection = new lmtp({
                lmtp: true,
                socket: this.found.socket.path,
            })

            connection.on('error', reject)

            const envelope = { from: 'matt@tnpi.net', to: 'matt@simerson.net' };
            connection.connect(() => {
                connection.send(envelope, data.toString(), (err, res) => {
                    if (err) return reject(err);
                    resolve(this.parseScanReply(res));
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
