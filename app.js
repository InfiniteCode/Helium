
var express = require('express');
var app = express();

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var session = require('express-session');
var flash = require('connect-flash');
var nconf = require("nconf");
nconf.env().argv();
nconf.file('./config.json');
nconf.file(app.get('env') === 'development' ? './config.dev.json' : './config.prod.json');

var routes = require('./routes/index');
var auth = require('./routes/auth');
var editor = require('./routes/editor');
var files = require('./routes/files');
var data = require('./routes/data');
global.appRoot = path.resolve(__dirname);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon('/public/favicon.png'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(session({
    secret: nconf.get("secret").session,
    saveUninitialized: true,
    resave: true
}));
app.use(flash()); // use connect-flash for flash messages stored in session
app.use(express.static(path.join(__dirname, 'public')));

if (app.get('env') !== 'development') {
    app.get('/*', function (req, res, next) {
        if (req.headers.host.match(/^www/) == null) res.redirect(301, req.protocol + '://www.' + req.headers.host + req.url);
        else next();
    });
}

app.use('/data', data);
app.use('/auth', auth);
app.use('/editor', editor);
app.use('/files', files);
app.use('/', routes);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;