
var express = require('express');
var router = express.Router();
var auth = require('./../modules/auth');
var da = require('./../modules/data-access');
var mailer = require('./../modules/mailer');

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
                case "navbar": cfg.navbar = configs[i].get("data"); break;
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
    var loadFrontContent = urlId == null ? function(id, cb) { cb(null); } : function(id, cb) { getRawArticle(id, cb, true); };

    //TODO Navbar has to be cached!
    prepareConfigurable(function(content) {
        loadFrontContent(urlId, function(article) {

        if(article) article = article.article; //Extra one level up the article
        var cookieEmail = req.cookies.email;
        var cookieToken = req.cookies.token;
        if(cookieEmail && cookieToken) {
            auth.tokenSignIn(cookieEmail, cookieToken, function(data, sk) {
                if(data.code == 0) {
                    //Renew cookies
                    res.cookie('email', sk.cookies.email, { maxAge: 900000, httpOnly: true });
                    res.cookie('token', sk.cookies.token, { maxAge: 900000, httpOnly: true });

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
    getRawArticle(req.originalUrl.substr(3), function(m) {
        if(m == null)
            res.status(400).send('Access denied.');
        else
            res.render('article', m);
    }, true);
});

router.get('/articles/:skip/:amount', function(req, res) {
    da.Article.findPublished(parseInt(req.params.skip), parseInt(req.params.amount), function(d) {
        var articles = [];
        if(d != null) for(var i = 0; i < d.models.length; ++i)
            articles.push(d.models[i].toPublicFormat());

        res.json({
            code: 0,
            articles: articles
        });
    }, req.session ? req.session.userId : undefined);
});

router.get('/article/cut/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    da.ArticleBody.findByArticle(parseInt(req.params.id), function(m) {
        if(m == null) {
            res.status(400).send('Access denied.');
        } else {
            res.json({
                code: 0,
                article: {
                    bodycut: m.get("bodycut")
                }
            });
        }
    });
});

function getRawArticle(id, cb, idUrl) {
    idUrl = idUrl ? true : false;
    var findCall = idUrl ? da.Article.findByUrlId : da.Article.findById;

    findCall(id, function(m) {
        if(m == null) {
            cb(null);
        } else {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var publishedOn = m.get('published_on');

            var whoAndWhen = "On " + months[publishedOn.getMonth()] + " " + publishedOn.getDate() + ", " + publishedOn.getFullYear() +
                " by " + m.relations.author.get("name_first") + " " + m.relations.author.get("name_last") +
                " at " + publishedOn.getHours() + ":" + ("0" + publishedOn.getMinutes()).slice(-2);

            var tags = [];
            for(var i = 0, len = m.relations.uniTags.models.length; i < len; ++i)
                tags.push(m.relations.uniTags.models[i].get("name"));

            var body = m.relations.body.models[0];

            cb({
            article: {
                title: m.get('title'),
                whoAndWhen: whoAndWhen,
                body: (body.get("cut")[0] ? body.get("body") + body.get("bodycut") : body.get("body")),
                tags: tags.join(", "),
                url: m.get("id_url"),
                comments: (m.get("comments")[0] ? true : false)
            }
        });
    }
    }, true);
}

router.get('/raw/article-body/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    da.ArticleBody.findByArticle(req.params.id, function(m) {
        if(m == null)
            res.status(400).send('Access denied.');
        else
            res.send(m.get("cut")[0] ? m.get("body") + m.get("bodycut") : m.get("body"));
    });
});

router.get('/raw/article/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    getRawArticle(req.params.id, function(m) {
        if(m == null)
            res.status(400).send('Access denied.');
        else
            res.render('article', m);
    });
});

router.get('/article/:id', function(req, res) {
    var articleId = parseInt(req.params.id);
    //TODO Consider adding a security check here for unpublished or private articles
    da.ArticleBody.findByArticle(articleId, function(m) {
        da.UserArticleTag.findByArticle(articleId, function(mTags) {
            if(m == null || mTags == null) {
                res.status(400).send('Access denied.');
            } else {
                var tags = [];
                for(var i = 0, len = mTags.models.length; i < len; ++i)
                    tags.push(mTags.models[i].relations.uni_tag.get('name'));

                res.json({
                    code: 0,
                    article: {
                        body: m.get("body"),
                        isCut: m.get("cut")[0],
                        tags: {
                            original: tags
                        }
                    }
                });
            }
        }, true);
    });
});

router.get('/author/:id', function(req, res) {
    //TODO This might be a security breach, consider embedding this data into articles
    //if not used anywhere else. However exposed data is ID and Name only here.
    da.User.findById(req.params.id, function(m){
        if(m == null) {
            res.status(400).send('Access denied.');
        } else {
            res.json({
                code: 0,
                author: {
                    nameFirst: m.get("name_first"),
                    nameLast: m.get("name_last")
                }
            });
        }
    });
});




router.post('/contact/send', function(req, res) {
    if(req.body.email == "" || req.body.email.length < 3 || req.body.email.indexOf("@") < 0) {
        res.json({
            code: -1,
            message: "Not a valid email."
        });
    } else {
        mailer.sendServiceEmail(req.body.email, "Message from " + req.body.name, req.body.message);
        res.json({
            code: 0
        });
    }
});



module.exports = router;