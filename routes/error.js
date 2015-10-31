'use strict';

var config  = require('../lib/config').loadConfig();

exports.addErrRoutes = function (app) {
    this.load404(app);
    this.loadUnhandled(app);
};

exports.load404 = function(app) {
    // abandon all hope and serve up a 404
    app.use(function(req, res, next) {
        //console.log('serving up a 404');

        // respond with html page
        if (req.accepts('html')) {
            res.status(404).sendFile('404.html', {
                root: config.docroot
            });
            return;
        }

        // respond with json
        if (req.accepts('json')) {
            res.status(404).send({
                err: 'Not found'
            });
            return;
        }

        res.status(404).send('Not found!');
    });
};

exports.loadUnhandled = function(app) {
    // application wide error handler (note the arity of 4)
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });
};