'use strict';

const fs      = require('node:fs');
const net     = require('node:net');
const path    = require('node:path');

const logger  = require('./logger');
const BaseScanner = require('./base-scanner');

class Scanner extends BaseScanner {
    constructor (name) {
        super()

        this.name = name || 'spamassassin'

        this.init()

        if (!this.cfg.socket)   this.cfg.socket   = 'spamd.socket'
        if (!this.cfg.cli.bin)  this.cfg.cli.bin  = 'spamc'
        if (!this.cfg.cli.args) this.cfg.cli.args = ' -R < '
        if (!this.cfg.net.host) this.cfg.net.host = '0.0.0.0'
        if (!this.cfg.net.port) this.cfg.net.port = '783'

        this.failFile = path.resolve('test/files/gtube.eml')
        this.passFile = path.resolve('test/files/clean.eml')
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        };

        if (/as possible spam/.test(response)) {
            result.fail.push('spam');
            return result;
        }
        if (/X-Spam-Flag: YES/.test(response)) {
            result.fail.push('spam');
            return result;
        }

        const match = response.match(/Spam: True ; ([\d.]+) \/ [\d.]+/)
        if (match) {
            result.fail.push(match[1])
            return result
        }

        result.pass.push('ham')
        return result
    }

    ping (socket, connOpts) {
        return new Promise((resolve, reject) => {
            let pingErr

            socket.connect(connOpts, () => {
                socket.write('PING SPAMC/1.4\r\n\r\n');
            })
            .on('end', () => {
                if (pingErr) return reject(pingErr)
                resolve(true)
            })
            .on('data', (data) => {
                if (/PONG/.test(data.toString())) {
                    return socket.end()
                }
                pingErr = new Error('unexpected: ' + data.toString())
                socket.end()
            })
            .on('close', (err) => {
                if (err) {
                    logger.info('on.close')
                    logger.error('transmision errors encountered')
                }
            })
            .on('error', (err) => {
                logger.info('error')
                reject(err)
            })
        })
    }

    async scanTcp (file) {
        if (!this.found.tcp) throw new Error('TCP listener not found')

        const stat = await fs.promises.stat(path.resolve(file))

        return new Promise((resolve, reject) => {
            const socket = this.getSocket(resolve, reject)

            const headers = [
                'SYMBOLS SPAMC/1.5',
                'Content-length: ' + stat.size,
            ];
            const cmd = headers.join('\r\n') + '\r\n\r\n';

            socket.connect(this.cfg.net, () => {
                socket.write(cmd, () => {
                    fs.createReadStream(file)
                    .pipe(socket)
                    .on('error', (err) => {
                        logger.error(err);
                    })
                })
            })
        })
    }

    async scanSocket (file) {
        if (!file) throw new Error('file is required!');
        if (!this.found.socket) throw new Error('TCP listener not found');

        const stat = await fs.promises.stat(path.resolve(file))

        return new Promise((resolve, reject) => {
            const socket = this.getSocket(resolve, reject);

            const headers = [
                'SYMBOLS SPAMC/1.5',
                'Content-length: ' + stat.size,
            ];
            const cmd = headers.join('\r\n') + '\r\n\r\n';

            socket.connect(this.found.socket, () => {
                socket.write(cmd, () => {
                    fs.createReadStream(file)
                    .pipe(socket)
                    .on('error', (err) => {
                        logger.error(err);
                    });
                });
            });
        });
    }

    getSocket (resolve, reject) {

        const socket = new net.Socket()
        let allData = ''

        socket.setTimeout(this.cfg.timeout * 1000);
        socket.on('end', () => {
            resolve(this.parseScanReply(allData));
        })
        .on('data', (data) => {
            allData += data;
        })
        .on('close', (err) => {
            if (err) {
                logger.info('on.close');
                logger.error('transmision errors encountered');
            }
        })
        .on('error', (err) => {
            logger.error('error');
            logger.error(err);
            reject(err);
        })

        return socket
    }
}

module.exports = {
    createScanner: (name) => {
        return new Scanner(name);
    }
}
