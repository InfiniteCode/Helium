
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
            title: generalDef.title,
            disqus: generalDef.disqus,
            tracking: generalDef.tracking,
            //Those also need URLs to create proper slug
            about: generalDef.about,
            terms: generalDef.terms,
            privacy: generalDef.privacy
        };

        if(configs == null) {
            console.log("Database config has not been initialized.");
        } else {
            for(var i = 0, len = configs.length; i < len; ++i)
            switch(configs[i].id) {
                case "navbar": cfg.navbar = JSON.parse(configs[i].get("data")); break;
                case "about": cfg.about = parseInt(configs[i].get("data")); break;
                case "title": cfg.title = configs[i].get("data"); break;
                case "terms": cfg.terms = parseInt(configs[i].get("data")); break;
                case "privacy": cfg.privacy = parseInt(configs[i].get("data")); break;
                case "disqus": cfg.disqus = configs[i].get("data"); break;
                case "tracking": cfg.tracking = configs[i].get("data"); break;
            }
        }

        var embeddedIds = [cfg.about, cfg.terms, cfg.privacy];
        for(var ni = 0, len = cfg.navbar.length; ni < len; ++ni) {
            if(cfg.navbar[ni].type == 1) embeddedIds.push(cfg.navbar[ni].article);
            else if (cfg.navbar[ni].type == 2) {
                for(var nis = 0, lens = cfg.navbar[ni].entries.length; nis < lens; ++nis)
                    embeddedIds.push(cfg.navbar[ni].entries[nis].article);
            }
        }

        //Now grab URLs for IDs
        da.Article.urlsFromIds(embeddedIds, function(urls) {
            if(urls != null) {
                cfg.urls = {};
                for(var i = 0, len = urls.length; i < len; ++i) {
                    var idUrl = urls[i].attributes["id_url"];
                    cfg.urls[urls[i].id.toString()] = idUrl;
                }
            }
            cb(cfg);
        });
    });
}

function rootResponse(req, res, urlId) {
    urlId = urlId ? urlId : null;
    var loadFrontContent = urlId == null ?
        function(id, cb) {
            //We need to fetch 10 most recent articles
            data.getArticles(0, 10, cb, req.session ? req.session.userId : undefined, true);
        } :
        function(id, cb) {
            data.getArticle(id, cb, true);
        };

    //TODO Navbar has to be cached!
    prepareConfigurable(function(cfg) {
        loadFrontContent(urlId, function(contentData) {
        var article = null, articles = null;
        if(contentData) {
            //Remove nesting
            if(contentData.article)
                article = contentData.article;
            if(contentData.articles)
                articles = contentData.articles;
        }

        var currentPage = null;
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
                    res.render('index', { loginData: JSON.stringify(data), config: cfg, article: article, articles: articles, currentPage: currentPage });
                } else {
                    //Erase invalid cookies
                    res.clearCookie('email');
                    res.clearCookie('token');
                    //TODO We might want to check here response code and delete also tokens from DB to prevent garbage
                    res.render('index', { config: cfg, article: article, articles: articles, currentPage: currentPage });
                }
            });
        } else {
            //Erase if there is just one cookie available
            if(cookieEmail || cookieToken) {
                res.clearCookie('email');
                res.clearCookie('token');
            }
            res.render('index', { config: cfg, article: article, articles: articles, currentPage: currentPage });
        }

        }); //loadFrontContent
    });
}

router.get('/', function(req, res) {
    rootResponse(req, res);
});

router.get('/partial/article/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    data.getArticle(parseInt(req.params.id), function(m) {
        if(m.code != 0)
            res.status(m.status).send(m.message);
        else
            res.render('article', m);
    });
});

router.get('/*', function(req, res) {
    rootResponse(req, res, req.originalUrl.substr(1));
});



module.exports = router;