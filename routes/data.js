
var express = require('express');
var router = express.Router();
var auth = require('./../modules/auth');
var data = require('./../modules/data');

router.get('/articles/:skip/:amount', function(req, res) {
    data.getArticles(parseInt(req.params.skip), parseInt(req.params.amount), function(d){
        res.json(d);
    }, req.session ? req.session.userId : undefined, false);
});

router.get('/article/cut/:id', function(req, res) {
    data.getArticleCut(parseInt(req.params.id), function(d){
        if(d.code == 0)
            res.json(d);
        else
            res.status(res.status).send(res.message);
    }, req.session ? req.session.userId : undefined);
});

router.get('/raw/article-body/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    data.getArticleBody(parseInt(req.params.id), function(d) {
        if(d.code == 0)
            res.send(d.body);
        else
            res.status(d.status).send(d.message);
    }, req.session ? req.session.userId : undefined);
});

router.get('/raw/article-bodycut/:id', function(req, res) {
    //TODO Consider adding a security check here for unpublished or private articles
    data.getArticleCut(parseInt(req.params.id), function(d) {
        if(d.code == 0)
            res.send(d.article.bodycut);
        else
            res.status(d.status).send(d.message);
    }, req.session ? req.session.userId : undefined);
});

router.get('/article/:id', function(req, res) {
    data.getArticleBase(parseInt(req.params.id), function(d) {
        if(d.code != 0)
            res.status(d.status).send(d.message);
        else
            res.json(d);
    });
});

router.get('/author/:id', function(req, res) {
    data.getAuthor(parseInt(req.params.id), function(d) {
        if(d.code != 0)
            res.status(d.status).send(d.message);
        else
            res.json(d);
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
