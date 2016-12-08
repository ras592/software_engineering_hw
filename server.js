var express = require('express'),
    morgan = require('morgan'),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    exphbs = require('express-handlebars'),
    mongodb = require('mongodb'),
    cookieParser = require('cookie-parser'),
    index = require('./app/controllers/index.server.controller'),
    users = require('./app/controllers/users.server.controller'),
    errorController = require('./app/controllers/error.server.controller'),
    chat = require('./app/controllers/chat.server.controller');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
    app.use(compress());
}

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());

app.use(session({
    saveUninitialized: true,
    resave: true,
    secret: 'developmentSecret'
}));

// for use in templates
app.use(function(req, res, next){
        res.locals.session = req.session;
        next();
});

var hbs = exphbs.create({
    defaultLayout: 'main',
    extname: '.hbs'
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');

var isAuthenticated = function(req, res, next) {
    var sess = req.session;
    if(sess.authenticated)
        return next();
    res.redirect('/login');
};

app.use(cookieParser());

// Mongodb
var MongoClient = mongodb.MongoClient;

// Connection URL
var url = 'mongodb://localhost:27017/software_engineering';

MongoClient.connect(url, function(err, db) {
    if(err) {
        console.log('Sorry, there is no mongo db server running.');
    } else {
        var attachDB = function(req, res, next) {
            req.db = db;
            next();
        };

        chat.init(db); // need database connection for chat file

        app.get('/chat', isAuthenticated, attachDB, chat.render);
        app.get('/login', users.render)
           .post('/login', attachDB, users.login);
        app.get('/signup', users.render_signup)
           .post('/signup', attachDB, users.signup);
        app.get('/logout', users.logout);
        app.get('/', attachDB, index.render)

        app.use(express.static('public'));
        app.use(errorController.notFound);
        app.use(errorController.serverError);

        io.on('connection', function(socket) {
            chat.sockets(io, socket);
        });

        http.listen(process.env.PORT || 3000, function() {
            console.log("server up");
        });
    }
});
