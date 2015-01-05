
var express = require('express');
var router = express.Router();
var auth = require('./../modules/auth');
var da = require('./../modules/data-access');
var mailer = require('./../modules/mailer');
var data = require('./../modules/data');

String.prototype.slug = function() { // <-- removed the argument
    var str = this; // <-- added this statement

    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
};

var navbarDef = JSON.stringify([
    {
        id: "Blog",
        type: 0
    },
    {
        id: "Open Source",
        type: 2,
        entries: [
            {
                id: "Open Source Entry",
                article: 1
            }
        ]
    },
    {
        id: "Services",
        type: 1,
        article: 2
    }]);

var generalDef = {
        about: 3,
        title: "Personal Blog and Portal",
        terms: 4,
        privacy: 5,
        disqus: "AlexKhilko",
        tracking: null
    };

function prepareConfigurable(cb) {
    da.Config.getConfigs(function(configs) {
        var cfg = {
            navbar: navbarDef,
            about: generalDef.about,
            title: generalDef.title,
            terms: generalDef.terms,
            privacy: generalDef.privacy,
            disqus: generalDef.disqus,
            tracking: generalDef.tracking
        };

        if(configs == null) {
            console.log("Database config has not been initialized.");
        } else {
            for(var i = 0, len = configs.length; i < len; ++i)
            switch(configs[i].id) {
                case "navbar": cfg.navbar = JSON.parse(configs[i].get("data")); break;
                case "about": cfg.about = configs[i].get("data"); break;
                case "title": cfg.title = configs[i].get("data"); break;
                case "terms": cfg.terms = configs[i].get("data"); break;
                case "privacy": cfg.privacy = configs[i].get("data"); break;
                case "disqus": cfg.disqus = configs[i].get("data"); break;
                case "tracking": cfg.tracking = configs[i].get("data"); break;
            }
        }

        cb(cfg);
    });
}

function rootResponse(req, res, urlId) {
    urlId = urlId ? urlId : null;
    var loadFrontContent = urlId == null ? function(id, cb) { cb(null); } : function(id, cb) { data.getArticle(id, cb, true); };

    //TODO Navbar has to be cached!
    prepareConfigurable(function(content) {
        loadFrontContent(urlId, function(article) {

        var cookieEmail = req.cookies.email;
        var cookieToken = req.cookies.token;
        if(cookieEmail && cookieToken) {
            auth.tokenSignIn(cookieEmail, cookieToken, function(data, sk) {
                if(data.code == 0) {
                    //Renew cookies
                    res.cookie('email', sk.cookies.email, { maxAge: 7*24*3600000, httpOnly: true });
                    res.cookie('token', sk.cookies.token, { maxAge: 7*24*3600000, httpOnly: true });
                    req.session.email = sk.session.email;
                    req.session.userId = sk.session.id;
                    req.session.access = sk.session.access;
                    res.render('index', { loginData: JSON.stringify(data), config: content });
                } else {
                    //Erase invalid cookies
                    res.clearCookie('email');
                    res.clearCookie('token');
                    //TODO We might want to check here response code and delete also tokens from DB to prevent garbage
                    res.render('index', { config: content });
                }
            });
        } else {
            //Erase if there is just one cookie available
            if(cookieEmail || cookieToken) {
                res.clearCookie('email');
                res.clearCookie('token');
            }
            res.render('index', { config: content });
        }

        }); //loadFrontContent
    });
}

router.get('/', function(req, res) {
    rootResponse(req, res);
});

router.get('/r/*', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    data.getArticle(req.originalUrl.substr(3), function(m) {
        if(m == null)
            res.status(400).send('Access denied.');
        else
            res.render('article', m);
    }, true);
});

router.get('/raw/article/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    data.getArticle(parseInt(req.params.id), function(m) {
        if(m.code != 0)
            res.status(m.status).send(m.message);
        else
            res.render('article', m);
    });
});

module.exports = router;