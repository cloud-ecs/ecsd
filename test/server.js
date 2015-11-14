'use strict';

var supertest = require('supertest');
var express   = require('express');
// var assert    = require('assert');

var logger    = require('../lib/logger');
var app       = express();
app.enable('trust proxy');

require('../routes/scan').public(app);

describe('routes, scan', function () {
    var agent = supertest.agent(app);

    describe('GET /scan', function() {
        it('responds with scan form', function(done) {
            agent
                .get('/scan')
                .set('Accept', 'text/html')
                .expect('Content-Type', /html/)
                .expect(/file/)
                .expect(200, done);
        });
    });

    describe('POST /scan', function() {
        it('responds with JSON scan results', function(done) {
            agent
                .post('/scan')
                // .set('x-forwarded-for', '192.168.1.1')
                // .send({ })
                .attach('virus', 'test/files/eicar.eml')
                .set('Accept', 'json')
                .expect(function (res) {
                    logger.debug(res.body);
                    if (res.body.success && res.body.extra.exists) {
                        return 'should not return success';
                    }
                })
                // .expect('Content-Type', /json/)
                // .expect(/file/)
                .expect(200, done);
        });
    });
});
