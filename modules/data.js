
var da = require("./data-access");

var Data = {
    getArticles: function(skip, amount, cb, userId, full) {
        //TODO Add userId support
        da.Article.findPublished(skip, amount, function(d) {
            var articles = [];
            if(d != null) for(var i = 0; i < d.models.length; ++i)
                articles.push(d.models[i].toPublicFormat());

            cb({code: 0,
                articles: articles
            });
        }, userId, full);
    },

    getArticleBody: function(id, cb, userId) {
        //TODO Consider adding a security check here for unpublished or private articles
        da.ArticleBody.findByArticle(id, function(m) {
            if(m == null)
                cb({
                    code: -1,
                    status: 400,
                    message: "Access denied."
                });
            else
                cb({
                    code: 0,
                    body: m.get("cut")[0] ? m.get("body") + m.get("bodycut") : m.get("body")
                });
        });
    },

    getArticleCut: function(id, cb, userId) {
        //TODO Add userId support
        //TODO Consider adding a security check here for unpublished or private articles
        da.ArticleBody.findByArticle(id, function(m) {
            if(m == null) {
                cb({
                    code: -1,
                    message: "Access denied.",
                    status: 400
                });
            } else {
                cb({
                    code: 0,
                    article: {
                        bodycut: m.get("bodycut")
                    }
                });
            }
        });
    },

    getArticle: function(id, cb, idUrl, userId) {
        idUrl = idUrl ? true : false;
        var findCall = idUrl ? da.Article.findByUrlId : da.Article.findById;

        findCall(id, function(m) {
            if(m == null) {
                cb({
                    code: -1,
                    status: 400,
                    message: "Not found."
                });
            } else {
                var tags = [];
                for(var i = 0, len = m.relations.uniTags.models.length; i < len; ++i)
                    tags.push(m.relations.uniTags.models[i].get("name"));

                var body = m.relations.body.models[0];
                var author = m.relations.author.attributes["name_first"] + " " + m.relations.author.attributes["name_last"];

                cb({
                    code: 0,
                    article: {
                        title: m.get('title'),
                        whoAndWhen: m.toWhoAndWhen(),
                        body: (body.get("cut")[0] ? body.get("body") + body.get("bodycut") : body.get("body")),
                        tags: tags.join(", "),
                        url: m.get("id_url"),
                        comments: (m.get("comments")[0] ? true : false),
                        author: author
                    }
                }, m.id, m);
            }
        }, true);
    },

    getArticleBase: function(id, cb) {
        //TODO Consider adding a security check here for unpublished or private articles
        da.ArticleBody.findByArticle(id, function(m) {
            da.UserArticleTag.findByArticle(id, function(mTags) {
                if(m == null || mTags == null) {
                    cb({
                        code: -1,
                        status: 400,
                        message: "Access denied."
                    });
                } else {
                    var tags = [];
                    for(var i = 0, len = mTags.models.length; i < len; ++i)
                        tags.push(mTags.models[i].relations.uni_tag.get('name'));

                    cb({
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
    },

    getAuthor: function(id, cb) {
        //TODO This might be a security breach, consider embedding this data into articles
        //if not used anywhere else. However exposed data is ID and Name only here.
        da.User.findById(id, function(m){
            if(m == null) {
                cb({
                    code: -1,
                    status: 400,
                    message: "Access denied."
                });
            } else {
                cb({
                    code: 0,
                    author: {
                        nameFirst: m.get("name_first"),
                        nameLast: m.get("name_last")
                    }
                });
            }
        });
    }
};

module.exports = Data;


