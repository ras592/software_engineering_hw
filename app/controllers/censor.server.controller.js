var mongodb = require('mongodb');

exports.render = function(req, res) {
    var sess = req.session;
    if(!sess.admin) {
        res.redirect('/login');
    } else {
        res.render('censor', {
            'censor_api': true
        });
    }
};

exports.get_list = function(req, res) {
    getCensorList(req, res);
};

exports.delete_censor = function(req, res) {
    var id = req.body._id;
    var collection = req.db.collection('censorlist');

    collection.deleteOne({'_id': new mongodb.ObjectId(id)}, function(err, resp) {
            if (err) {
                console.log(err);
                return res.json({'error': 'true'});
            } else {
                return res.json({'error': 'false'});
            }
    });
}

exports.censor = function(req, res) {
    var domain = req.body.link.domain;
    var safe = req.body.link.safe;

    insertCensorList(domain, safe, req, res, function(res) {
        res.redirect('censor');
    });
};

function getCensorList(req, res) {
    var collection = req.db.collection('censorlist');

    collection.find({}, function(err, list) {
        list.toArray(function(error, items) {
            if (error) {
                console.log(error);
                return res.json({'error': 'true'});
            } else {
                return res.json(items);
            }
        });
    });
}

function insertCensorList(domain, safe, req, res, callback) {
    var domain_name = toURL(domain).host_name;
    var collection = req.db.collection('censorlist');
    var res = res;

    collection.insert({'domain': domain_name, 'safe': safe}, function(error, result){
        if(error) {
            console.log(error);
        }
        return callback(res);
    });
}

function toURL(str) {
    var top_level_domains = ['.com', '.org', '.edu', '.gov', '.uk', '.net', '.ca', '.mil', '.info', '.ru', '.io'];
    var protocol = 'http://';
    var remainder = str;
    var host_name = '';
    var path = '';
    var add_protocol_bool = true;

    // protocol
    if (str.indexOf('http://') !== -1) {
        protocol = str.substring(0, 'http://'.length);
        remainder = str.substring('http://'.length);
        add_protocol_bool = false;
    } else if(str.indexOf('https://') !== -1) {
        protocol = str.substring(0, 'https://'.length);
        remainder = str.substring('http://'.length);
        add_protocol_bool = false;
    }

    // top level domain / host name split
    for(var top_level_idx in top_level_domains) {
        var idx = remainder.indexOf(top_level_domains[top_level_idx]);
        if(idx !== -1) {
            var host_name_idx = idx + top_level_domains[top_level_idx].length;
            host_name = remainder.substring(0, host_name_idx);
            path = remainder.substring(host_name_idx);
            var url = str;
            if(add_protocol_bool) {
                url = protocol + str;
            }
            return {
                protocol: protocol,
                host_name: host_name,
                url: url,
                path: path
            }
        }
    }
    return null;
}
