exports.notFound = function(req, res, next) {
    res.status(404);
    res.render('404');
};

exports.serverError = function(err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
};
