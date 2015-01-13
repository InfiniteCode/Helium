var express = require('express');
var router = express.Router();
var da = require('./../modules/data-access');

var BodyCutTemplate = '<h2 class="bodycut">&nbsp;</h2>';

function convertToSlug(Text)
{
    return Text
        .toLowerCase()
        .replace(/ /g,'-')
        .replace(/[^\w-]+/g,'');
}

function processUniTags(need, found, missing, existing, baked, userId, artId) {
    for(var j = 0, jLen = need.length; j < jLen; ++j) {
        var index = -1;
        for(var i = 0, len = found.length; i < len; i++) {
            if (found[i].get('name') == need[j]) {
                index = i;
                break;
            }
        }

        if(index == -1)
            missing.push(need[j]);
        else {
            baked.push({
                user: userId,
                article: artId,
                tag: found[index].id,
                live: false
            });
            existing.push(need[j]);
        }
    }
}

router.get('/articles', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    da.Article.findByAuthor(req.session.userId, function(d) {
        var articles = [];
        for(var i = 0; i < d.models.length; ++i)
            articles.push(d.models[i].toEditorFormat());

        res.json({
            code: 0,
            articles: articles
        });
    });
});

router.get('/article/publish/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var now = new Date();
    var userId = req.session.userId;
    var artId = parseInt(req.params.id);
    da.Article.findById(artId, function(m) {
        if(m == null || m.get('author') != userId) {
            res.status(400).send("Access denied.");
            return;
        }

        var artHidden = m.get('hidden_modified')[0] ? true : false;
        var artComments = m.get('comments_modified')[0] ? true : false;
        var artPrivate = m.get('private_modified')[0] ? true : false;
        var artModTitle = m.get("title_modified");
        var artModUrl = m.get("id_url_modified");
        m.attributes['title_modified'] = null;
        m.attributes['id_url_modified'] = null;
        m.attributes['title'] = artModTitle;
        m.attributes['id_url'] = artModUrl;
        m.attributes['modified'] = false;
        m.attributes['published_on'] = now;
        m.attributes['private'] = artPrivate;
        m.attributes['comments'] = artComments;
        m.attributes['hidden'] = artHidden;

        m.save().then(function(d){});

        da.ArticleBody.findByArticle(artId, function(mBody) {
            var bodyCut = mBody.get("body_modified").split(BodyCutTemplate);
            mBody.attributes["body"] = bodyCut.length == 1 ? mBody.get("body_modified") : bodyCut[0];
            mBody.attributes["bodycut"] = bodyCut.length == 1 ? null : bodyCut[1];
            mBody.attributes["cut"] = bodyCut.length > 1;
            mBody.attributes["body_modified"] = null;

            mBody.save().then(function(d){});
        });

        da.UserArticleTag.deleteByArticle(artId, function(){
            //Just switch all tags to live now
            da.UserArticleTag.publishByArticle(artId);
        }, true);

        res.json({
            code: 0,
            article: {
                title: artModTitle,
                url: artModUrl,
                status: "published",
                hidden: artHidden,
                private: artPrivate,
                comments: artComments,
                publishedOn: now.getTime()
            }
        });
    });
});

router.get('/tags/:startsWith', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    //TODO Cache this!
    da.UniTag.findSimilar(req.params.startsWith, function(m) {
        if(m == null)
            res.json({});
        else {
            var tags = [];
            for(var i = 0, len = m.models.length; i < len; ++i)
                tags.push({text: m.models[i].get("name")});
            res.json(tags);
        }
    });
});

router.get('/article/rollback/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var userId = req.session.userId;
    var artId = parseInt(req.params.id);
    da.Article.findById(artId, function(m) {
        if(m == null || m.get('author') != userId) {
            res.status(400).send("Access denied.");
            return;
        } else {
            var artTitle = m.get("title");
            var artUrl = m.get("id_url");
            var artHidden = m.get('hidden')[0] ? true : false;
            var artPrivate = m.get('private')[0] ? true : false;
            var artComments = m.get('comments')[0] ? true : false;

            m.attributes["title_modified"] = null;
            m.attributes["id_url_modified"] = null;
            m.attributes["private_modified"] = artPrivate;
            m.attributes["hidden_modified"] = artComments;
            m.attributes["comments_modified"] = artHidden;
            m.attributes["modified"] = false;
            m.attributes["modified_on"] = m.attributes["published_on"];
            m.save().then(function(d){});

            da.ArticleBody.findByArticle(artId, function(mBody) {
                mBody.attributes["body_modified"] = null;
                mBody.save().then(function(d){});
            });

            da.UserArticleTag.deleteByArticle(artId, function(d){}, false);

            res.json({
                code: 0,
                article: {
                    id: artId,
                    title: artTitle,
                    url: artUrl,
                    status: "published",
                    hidden: artHidden,
                    private: artPrivate,
                    comments: artComments
                }
            });
        }
    });
});

router.post('/article/create', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var now = new Date();
    var userId = req.session.userId;

    var artTitle = req.body.titleWIP;
    var artBody = req.body.body.wip;
    var artBodyLang = req.body.language;
    var artPrivate = req.body.options.wip.private;
    var artHidden = req.body.options.wip.hidden;
    var artComments = req.body.options.wip.comments;
    var artUrl = req.body.urlWIP;
    var artTags = req.body.tags.wip;

    //TODO Consider making this as a single transaction
    da.Article.forge({
        id_url: artUrl,
        id_url_modified: artUrl,
        title: artTitle,
        title_modified: artTitle,
        author: userId,
        "private": artPrivate,
        hidden: artHidden,
        comments: artComments,
        private_modified: artPrivate,
        hidden_modified: artHidden,
        comments_modified: artComments,
        language: artBodyLang,
        modified: true,
        modified_on: now,
        created_on: now
    }).save().then(function(model){
        var artId = model.id;

        da.ArticleBody.forge( {
                article: artId,
                body_modified: artBody
            }).save();

        //Create new tags, no need to delete previous ones as this is a new article
        var artTagsRaw = [];
        for(var i = 0; i <  artTags.length; ++i)
            artTagsRaw.push(artTags[i].text);

        //Update UniTags first in case we have some already in DB
        da.UniTag.findByTag(artTagsRaw, function(tagsFound){
            tagsFound = !tagsFound ? [] : tagsFound.models;

            var existing = [];
            var missing = [];
            var tagsBaked = [];

            processUniTags(artTagsRaw, tagsFound, missing, existing, tagsBaked, userId, artId);

            if(missing.length > 0) {
                da.UniTag.insertMultiple(missing, function(data){
                    for(var i = 0; i < data.models.length; ++i)
                        tagsBaked.push({
                            user: userId,
                            article: artId,
                            tag: data.models[i].id,
                            live: false
                        });

                    da.UserArticleTag.insertMultiple(tagsBaked, function(d){});
                });
            } else
                da.UserArticleTag.insertMultiple(tagsBaked, function(d){});
        });

        res.json({
            code: 0,
            article: {
                id: artId,
                modifiedOn: now.getTime(),
                createdOn: now.getTime()
            }
        });
    });
});

router.get('/article/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    //TODO For security reasons we might want to check user ID here in the article
    da.ArticleBody.findByArticle(req.params.id, function(bodyModel) {
        da.UserArticleTag.findByArticle(req.params.id, function(tagsModel) {
            if(bodyModel == null || tagsModel == null)
                res.json({ code: -1, message: "Invalid article."});
            else {
                var body = bodyModel.get('body');
                var bodyCut = bodyModel.get('bodycut');
                var bodyOriginal = body == null ? null :
                    (bodyCut ? (body + BodyCutTemplate + bodyCut) : body);

                var originalTags = [];
                var modifiedTags = [];
                for(var i = 0; i < tagsModel.models.length; ++i)
                    if(tagsModel.models[i].get('live')[0])
                        originalTags.push(tagsModel.models[i].relations.uni_tag.get('name'));
                    else
                        modifiedTags.push(tagsModel.models[i].relations.uni_tag.get('name'));


                res.json({
                    code: 0,
                    article: {
                        body:  {
                            original: bodyOriginal,
                            modified: bodyModel.get('body_modified')
                        },
                        tags: {
                            original: originalTags,
                            modified: modifiedTags
                        }
                    }
                });
            }
        })
    });
});

router.put('/article/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    var now = new Date();
    var userId = req.session.userId;

    var artTitle = req.body.titleWIP;
    var artBody = req.body.body.wip; //TODO Both create and save should sanitize HTML, remove any Javascript codes from it
    var artBodyLang = req.body.language;
    var artPrivate = req.body.options.wip.private;
    var artHidden = req.body.options.wip.hidden;
    var artComments = req.body.options.wip.comments;
    var artUrl = req.body.urlWIP;
    var artTags = req.body.tags.wip;
    var artId = req.params.id;

    da.Article.findById(artId, function(m) {
        if(m == null || m.get('author') != userId)
            res.status(400).send('Access denied.');
        else {
            m.attributes['title_modified'] = artTitle;
            m.attributes['id_url_modified'] = artUrl;
            m.attributes['private_modified'] = artPrivate;
            m.attributes['hidden_modified'] = artHidden;
            m.attributes['comments_modified'] = artComments;
            m.attributes['modified_on'] = now;
            m.attributes['modified'] = true;

            if(m.get('published_on') == null) {
                m.attributes['title'] = artTitle;
                m.attributes['id_url'] = artUrl;
            }

            m.save().then(function() {});

            da.ArticleBody.findByArticle(artId, function(mBody){
                mBody.attributes['body_modified'] = artBody;
                mBody.save().then(function() {});
            });

            var artTagsRaw = [];
            for(var i = 0; i <  artTags.length; ++i)
                artTagsRaw.push(artTags[i].text);

            da.UniTag.findByTag(artTagsRaw, function(tagsFound) {
                tagsFound = !tagsFound ? [] : tagsFound.models;

                var existing = [];
                var missing = [];
                var tagsBaked = [];

                processUniTags(artTagsRaw, tagsFound, missing, existing, tagsBaked, userId, artId);

                //Delete all previous non-live tags first and then add new ones
                da.UserArticleTag.deleteByArticle(artId, function() {
                    if(missing.length > 0) {
                        da.UniTag.insertMultiple(missing, function(data){
                            for(var i = 0; i < data.models.length; ++i)
                                tagsBaked.push({
                                    user: userId,
                                    article: artId,
                                    tag: data.models[i].id,
                                    live: false
                                });

                            da.UserArticleTag.insertMultiple(tagsBaked, function(d){});
                        });
                    } else
                        da.UserArticleTag.insertMultiple(tagsBaked, function(d){});
                }, false);
            });

            res.json({
                code: 0,
                article: {
                    id: artId,
                    modifiedOn: now.getTime(),
                    url: artUrl
                }
            });
        }
    });
});

router.delete('/article/:id', function(req, res) {
    if(!req.session || !req.session.userId) { res.status(400).send("Access denied."); return; }

    da.Article.findById(req.params.id, function(m){
        if(m == null || m.get('author') != req.session.userId) {
            res.status(400).send("Access denied.");
        } else {
            //Delete now all entries for this article from all tables
            da.ArticleBody.deleteByArticle(req.params.id);
            da.UserArticleTag.deleteByArticle(req.params.id);
            da.Article.deleteById(req.params.id);

            res.json({
                code: 0,
                message: "deleted",
                article: {
                    id: req.params.id
                }
            });
        }
    });
});

module.exports = router;



