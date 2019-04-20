'use strict';

// const child   = require('child_process');
const fs      = require('fs');
const net     = require('net');
const path    = require('path');

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

        // logger.info(util.inspect(this, { depth: null }))
    }

    parseScanReply (response) {

        const result = {
            pass: [],
            fail: [],
            name: this.name,
            raw: response,
            error: [],
        };

        // logger.info(response);
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
            // logger.info(match[1]);
            result.fail.push(match[1])
            return result
        }

        result.pass.push('ham')
        return result
    }

    ping (socket, connOpts, done) {
        let pingErr = undefined

        socket.connect(connOpts, () => {
            socket.write('PING SPAMC/1.4\r\n\r\n');
        })
        .on('end', () => {
            if (pingErr) return done(pingErr)
            done(null, true)
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
            done(err)
        })
    }

    scanTcp (file, done) {
        if (!this.found.tcp) return done(new Error('TCP listener not found'))

        const scanErr = ''
        const socket = this.getSocket(scanErr, done)

        fs.stat(path.resolve(file), (err, stat) => {

            // CHECK - 'SPAMD/1.1 0 EX_OK\r\nSpam: False ; 2.3 / 5.0\r\n\r\n',
            // REPORT - 'SPAMD/1.1 0 EX_OK\r\n',
            // REPORT_IFSPAM
            // SYMBOLS - 'SPAMD/1.1 0 EX_OK\r\nContent-length: 62
            //          Spam: False ; 2.3 / 5.0\r\n
            //          APOSTROPHE_FROM,MISSING_DATE,MISSING_MID,NO_RECEIVED,
            //          NO_RELAYS',
            // HEADERS - SYMBOLS + message headers
            const headers = [
                'SYMBOLS SPAMC/1.5',
                'Content-length: ' + stat.size,
            ];
            const cmd = headers.join('\r\n') + '\r\n\r\n';
            // logger.info(cmd);

            socket.connect(this.cfg.net, () => {
                socket.write(cmd, () => {
                    fs.createReadStream(file)
                    .pipe(socket)
                    .on('end', () => {
                        // logger.info('sent file!');
                    })
                    .on('error', (err) => {
                        logger.error(err);
                    })
                })
            })
        })
    }

    scanSocket (file, done) {
        if (!file) return done(new Error('file is required!'));
        if (!this.found.socket) return done(new Error('TCP listener not found'));

        let scanErr = '';
        const socket = this.getSocket(scanErr, done);

        fs.stat(path.resolve(file), (err, stat) => {
            const headers = [
                'SYMBOLS SPAMC/1.5',
                'Content-length: ' + stat.size,
            ];

            const cmd = headers.join('\r\n') + '\r\n\r\n';

            socket.connect(this.found.socket, () => {
                socket.write(cmd, () => {
                    fs.createReadStream(file)
                    .pipe(socket)
                    .on('end', () => {
                        // logger.info('sent file!');
                    })
                    .on('error', function (err) {
                        logger.error(err);
                    });
                });
            });
        });
    }

    getSocket (scanErr, done) {

        const socket = new net.Socket()
        let allData = ''

        socket.setTimeout(this.cfg.timeout * 1000);
        socket.on('end', () => {
            if (scanErr) return done(scanErr);
            done(null, this.parseScanReply(allData));
        })
        .on('data', (data) => {
            allData += data;
        })
        .on('close', (err) => {
            if (err) {
                logger.info('on.close');
                logger.error('transmision errors encountered');
            }
            // logger.debug('close');
        })
        .on('error', (err) => {
            logger.error('error');
            logger.error(err);
            done(err);
        })

        return socket
    }
}

module.exports = {
    createScanner: (name) => {
        return new Scanner(name);
    }
}
