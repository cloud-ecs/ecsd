

exports.all = function (req, res) {
	console.log(req);
	res.json({req: req});
}