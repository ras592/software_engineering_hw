exports.render = function(req, res) {
    var sess = req.session;
    if(sess.authenticated) {
        res.redirect('/');
    }
    if (req.session.error_msg) {
        error_msg = req.session.error_msg;
        delete req.session.error_msg;
        res.render('login', {
            error_msg: error_msg
        });
    } else if (req.session.sign_up_worked) {
        sign_up_worked = req.session.sign_up_worked;
        delete req.session.sign_up_worked;
        res.render('login', {
            sign_up_worked: sign_up_worked
        });
    } else {
        res.render('login');
    }
};

exports.render_signup = function(req, res) {
    var sess = req.session;
    if(sess.authenticated) {
        res.redirect('/');
    }
    if (req.session.error_msg) {
        error_msg = req.session.error_msg;
        delete req.session.error_msg;
        res.render('signup', {
            error_msg: error_msg
        });
    } else {
        res.render('signup');
    }
};

exports.login = function(req, res) {
    var email = req.body.user.email;
    var pass = req.body.user.password;

    query_login(req, res, email, pass);
};

exports.logout = function(req, res) {
    req.session.destroy(function() {
        res.redirect('/login');
    });
};

exports.signup = function(req, res) {
    const name = req.body.user.name;
    const email = req.body.user.email;
    const pass = req.body.user.password;
    const confirm_pass = req.body.user.confirm_pass;

    if(pass !== confirm_pass) {
        req.session.error_msg = "Sign Up Failed: Passwords are not the same.";
        res.redirect('/signup');
    } else {
        check_email_unique(req, res, name, email, pass);
    }
}

function query_login(req, res, email, pass) {
    var collection = req.db.collection('users');
    var login_resp = {
        error: true,
        req: req,
        res: res
    };

    collection.findOne({'email': email, 'pass': pass}, function(error, result) {
        if (error) {
            console.log(error);
            login(login_resp);
        } else {
            if (result === null) {
                login(login_resp);
            } else if (result.hasOwnProperty('username') !== undefined &&
                result.hasOwnProperty('email') !== undefined){
                login_resp.error = false;
                login_resp.user = result;
                login(login_resp);
            } else {
                login(login_resp);
            }
        }
    });
}

function login(resp) {
    // login callback
    if (!resp.error) {
        resp.req.session.authenticated = true;
        resp.req.session.username = resp.user.username;
        resp.req.session.email = resp.user.email;
        if (resp.user.admin !== undefined) {
            resp.req.session.admin = resp.user.admin
        }
        resp.res.redirect('/chat');
    } else {
        resp.req.session.error_msg = "Login Failed: Email password combination failed.";
        resp.res.render('login');
    }
}

function sign_up(resp) {
    // sign up callback
    if (!resp.error) {
        resp.req.session.sign_up_worked = true;
        resp.res.redirect('/login');
    } else {
        resp.req.session.error_msg = "Sign Up Failed: Email already in use.";
        resp.res.render('signup');
    }
}

function check_email_unique(req, res, name, email, pass) {
    var collection = req.db.collection('users');
    var resp = {
        error: true,
        req: req,
        res: res
    };

    collection.findOne({'email': email}, function(error, result) {
        if (error) {
            console.log(error);
            sign_up(resp);
        } else if (result) {
            sign_up(resp); // email in use
        } else {
            resp.error = false;
            resp.name = name;
            resp.email = email;
            resp.pass = pass;
            insert_user(resp);
        }
    });
}

function insert_user(resp) {
    var collection = resp.req.db.collection('users');
    resp.error = true;

    collection.insert({'username': resp.name, 'email': resp.email, 'pass': resp.pass, 'admin': false}, function(error, result) {
        if (error) {
            console.log(error);
            sign_up(resp);
        } else {
            resp.error = false;
            sign_up(resp);
        }
    });
}
