exports.render = function(req, res) {
    ret_obj = {};

    ret_obj.title = 'Group 1 Web Stack Index Page';
    res.render('index', {
        ret_obj: ret_obj
    });
};
