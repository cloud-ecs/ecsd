
var scanner = require('../lib/scanner');

exports.public = function (app) {

    app.post('/scan/all', scanner.all);


};
