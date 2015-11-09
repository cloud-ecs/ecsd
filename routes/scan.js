'use strict';

var scanner = require('../lib/scanner');

exports.public = function (app) {
	// curl -X POST -F eicar=@eicar.eml localhost:8000/scan

    app.post('/scan', scanner.post);
    app.get ('/scan', scanner.get);

    app.get ('/status/scannersAll',       scanner.listAll);
    app.get ('/status/scannersAvailable', scanner.listAvailable);
};
