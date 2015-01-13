
var nconf = require("nconf");

var knex = require("knex")({ client: "mysql", connection: nconf.get("db") });
var bookshelf = require('bookshelf')(knex);

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function genWhoAndWhen(date, nameFirst, nameLast) {
    return "On " + months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear() +
        " by " + nameFirst + " " + nameLast +
        " at " + date.getHours() + ":" + ("0" + date.getMinutes()).slice(-2);
}

var Config = bookshelf.Model.extend(
    {
        tableName: 'config'
    }, {
        getConfigs: function(callback) {
            callback = callback ? callback : function() {};
            new Config()
                .query(function(qb) {
                    qb.where("id", "in", ["navbar", "about", "title", "terms", "privacy", "disqus", "tracking"])
                })
                .fetchAll()
                .then(function(model) {
                    callback(model == null ? null : model.models);
                }).catch(function(err) {
                    callback(null);
                })
        },

        getNavbarConfig: function(callback) {
            callback = callback ? callback : function() {};
            new Config({'id': "navbar"})
                .fetch()
                .then(function(model) {
                    callback(model);
                }).catch(function(err) {
                    callback(null);
                })
        }
    }
);

var User = bookshelf.Model.extend(
    {
        tableName: 'user',
        articles: function() {
            return this.hasMany(Article);
        }
    },
    {
        findById: function(id, callback){
            callback = callback ? callback : function() {};
            new User({'id': id})
                .fetch()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        findByEmail: function(email, callback){
            callback = callback ? callback : function() {};
            User.where({'email': email})
                .fetch()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        }
    }
);

var UserArticleTag = bookshelf.Model.extend(
    {
        tableName: 'user_article_tag',
        uni_tag: function() {
            return this.belongsTo(UniTag, 'tag');
        }
    },
    {
        findByArticle: function(article, callback, live){
            callback = callback ? callback : function() {};
            if(typeof live == "undefined")
                UserArticleTag.where({'article': article})
                    .fetchAll({withRelated: ['uni_tag']})
                    .then(function(model) {
                        callback(model);
                    }).catch(function (err) {
                        callback(null);
                    })
            else
                UserArticleTag.where({'article': article, 'live': live})
                    .fetchAll({withRelated: ['uni_tag']})
                    .then(function(model) {
                        callback(model);
                    }).catch(function (err) {
                        callback(null);
                    })
        },

        insertMultiple: function(tags, callback) {
            callback = callback ? callback : function() {};
            knex('user_article_tag').insert(tags).then(function(d) {
                    callback(d);
            });
        },

        publishByArticle: function(article, callback) {
            callback = callback ? callback : function() {};
            knex('user_article_tag')
                .where({article: article})
                .update({ live: true }).then(function(d) {
                    callback(d);
                })
        },

        deleteByArticle: function(id, callback, live){
            callback = callback ? callback : function() {};
            if(typeof live == "undefined")
                UserArticleTag.where({'article': id})
                    .destroy()
                    .then(callback)
                    .catch(function (err) {
                        callback(null);
                    });
            else
                UserArticleTag.where({'article': id, 'live': live})
                    .destroy()
                    .then(callback)
                    .catch(function (err) {
                        callback(null);
                    });
        }
    });

var Article = bookshelf.Model.extend(
    {
        tableName: 'article',
        tags: function() {
            return this.hasMany(UserArticleTag, 'article');
        },

        uniTags: function() {
            return this.belongsToMany(UniTag).through(UserArticleTag, 'article', 'tag');
        },

        author: function() {
            return this.belongsTo(User, 'author');
        },

        body: function() {
            return this.hasMany(ArticleBody, 'article');
        },

        toEditorFormat: function() {
            return {
                    id: this.id,
                    url: this.get('id_url'),
                    urlModified: this.get('id_url_modified'),
                    title: this.get('title'),
                    titleModified: this.get('title_modified'),
                    language: this.get('language'),
                    body: {},
                    status: (this.get('published_on') != null ? (this.get('modified')[0] ? 'modified' : 'published') : 'draft'),
                    publishedOn: this.get('published_on'),
                    createdOn: this.get('created_on'),
                    modifiedOn: this.get('modified_on'),
                    modified: false, //this is modified by editor, we keep this false always
                    synced: true,    //since this is just fetched from DB, it is the latest
                    options: {
                        original: {
                            hidden: this.get("hidden")[0] ? true : false,
                            "private": this.get("private")[0] ? true : false,
                            comments: this.get("comments")[0] ? true : false
                        },
                        modified: {
                            hidden: this.get("hidden_modified")[0] ? true : false,
                            "private": this.get("private_modified")[0] ? true : false,
                            comments: this.get("comments_modified")[0] ? true : false,
                        }
                    }
                };
        },

        toWhoAndWhen: function() {
            return genWhoAndWhen(this.get('published_on'), this.relations.author.attributes["name_first"],
                this.relations.author.attributes["name_last"]);
        },

        toPublicFormat: function() {
            var res =  {
                id: this.id,
                author: this.get('author'),
                url: this.get('id_url'),
                title: this.get('title'),
                language: this.get('language'),
                publishedOn: this.get('published_on')
            };

            if(this.relations.body) {
                var m = this.relations.body.models[0];
                res.body = m.attributes["body"];
                res.cut = m.attributes["cut"][0] ? true : false;
                res.bodyCut = m.attributes["bodycut"];
            }

            if(this.relations.author) {
                res.author = {};
                res.author.nameFirst = this.relations.author.attributes["name_first"];
                res.author.nameLast = this.relations.author.attributes["name_last"];

                res.whoAndWhen = this.toWhoAndWhen();
            }

            if(this.relations.uniTags) {
                var tags = [];
                for(var i = 0, len = this.relations.uniTags.models.length; i < len; ++i)
                    tags.push(this.relations.uniTags.models[i].get("name"));

                res.tags = tags;
            }

            return res;
        }
    }, {
        findByUrlId: function(urlid, callback, full) {
            callback = callback ? callback : function() {};
            full = full ? full : false;
            var related = full ? ['author', 'body', 'uniTags'] : [];

            new Article()
                .where({id_url: urlid})
                .fetch({withRelated: related})
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        findById: function(id, callback, full) {
            callback = callback ? callback : function() {};
            full = full ? full : false;
            var related = full ? ['author', 'body', 'uniTags'] : [];

            new Article({'id': id})
                .fetch({withRelated: related})
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        urlsFromIds: function(ids, callback) {
            callback = callback ? callback : function() {};
            new Article()
                .query(function(qb) {
                    qb.where("id", "in", ids)
                })
                .fetchAll()
                .then(function(model) {
                    callback(model == null ? null : model.models);
                }).catch(function(err) {
                    callback(null);
                })
        },

        findByAuthor: function(author, callback){
            callback = callback ? callback : function() {};
            Article.where({'author': author})
                .fetchAll()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        deleteById: function(id, callback){
            callback = callback ? callback : function() {};
            Article.where({'id': id})
                .destroy()
                .then(callback)
                .catch(function (err) {
                    callback(null);
                });
        },

        findPublished: function(skip, amount, callback, userId, full) {
            //TODO Include userId into query for private articles by this user
            //TODO It is better to compare ID rather than do Skip in a query
            callback = callback ? callback : function() {};
            var related = full ? ['author', 'body', 'uniTags'] : [];

            new Article()
                .query(function(qb) {
                    qb.where('hidden', false).whereNotNull('published_on').limit(amount).offset(skip).orderBy('published_on','desc')
                })
                .fetchAll({withRelated: related})
                .then(function(model) {
                    callback(model);
                })
        }
    });

var ArticleBody = bookshelf.Model.extend({
        tableName: 'article_body',
        article: function() {
            return this.belongsTo(Article, 'article');
        }
    }, {
        findByArticle: function(article, callback) {
            ArticleBody.where({'article': article})
                .fetch()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        deleteByArticle: function(id, callback){
            callback = callback ? callback : function() {};
            ArticleBody.where({'article': id})
                .destroy()
                .then(callback)
                .catch(function (err) {
                    callback(null);
                });
        }
    });

var FolderFile = bookshelf.Model.extend(
    {
        tableName: 'folder_file',

        toPublicFormat: function(){
            return this.get('is_folder')[0] ?
                {
                    id: this.id,
                    title: this.get("name"),
                    createdOn: this.get("created_on")
                } :
                {
                    id: this.id,
                    url: this.get("url"),
                    thumbUrl: this.get("thumb_url"),
                    name: this.get("name"),
                    createdOn: this.get("created_on"),
                    modifiedOn: this.get("modified_on"),
                    type: this.get("type"),
                    size: this.get("size")
                }
            }
    }, {
        findByUser: function(user, callback, parent){
            callback = callback ? callback : function() {};
            new FolderFile()
                .query(function(qb) {
                    qb.where({'user': user, 'parent_folder': (typeof parent == "undefined" ? null : parent)}).orderBy('name','desc')
                })
                .fetchAll()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        findById: function(id, callback){
            callback = callback ? callback : function() {};
            new FolderFile({id: id})
                .fetch()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        findByFolder: function(id, callback){
            callback = callback ? callback : function() {};
            new FolderFile()
                .query(function(qb) {
                    qb.where({'parent_folder': id})
                })
                .fetchAll()
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        moveFiles: function(list, dest, callback) {
            callback = callback ? callback : function() {};
            knex('folder_file')
                .whereIn('id', list)
                .update({ parent_folder: dest })
                .then(function(d) {
                    callback(d);
                }).catch(function (err) {
                    callback(null);
                });
        },

        rename: function(id, newName, userId, callback){
            callback = callback ? callback : function() {};
            knex('folder_file')
                .where({id: id, user: userId})
                .update({name: newName})
                .then(function(d) {
                    callback(d);
                }).catch(function (err) {
                    callback(null);
                });
        },

        deleteById: function(id, callback){
            callback = callback ? callback : function() {};

            FolderFile.where({'id': id})
                .destroy()
                .then(callback)
                .catch(function (err) {
                    callback(null);
                });
        }
    });

var TokenEmail = bookshelf.Model.extend({
    tableName: 'token_email'
});

var TokenLogin = bookshelf.Model.extend(
    {
        tableName: 'token_login',
        user: function() {
            return this.belongsTo(User, "user");
        }
    },
    {
        findByToken: function(token, callback){
            TokenLogin.where({'token': token})
                .fetch({withRelated: ['user']})
                .then(function(model) {
                    callback(model);
                }).catch(function (err) {
                    callback(null);
                });
        },

        deleteByToken: function(token, callback){
            callback = callback ? callback : function() {};
            TokenLogin.where({'token': token})
                .destroy()
                .then(callback)
                .catch(function (err) {
                    callback(null);
                });
        }
    });

var UniTag = bookshelf.Model.extend(
    {
        tableName: 'uni_tag',
        allUserTags: function() {
            return this.belongsTo(UserArticleTag, 'tag');
        }
    },
    {
        findSimilar: function(s, callback) {
            //TODO Make sure 's' does not include special characters that can be processed as a part of
            //like function, % for instance
            new UniTag()
                .query(function(qb) {
                    qb.where('name', 'LIKE', '%' + s + '%')
                })
                .fetchAll()
                .then(function(model) {
                    callback(model);
                })
                .catch(function (err) {
                    callback(null);
                });
        },

        findByTag: function(tags, callback) {
            new UniTag()
                .query(function(qb) {
                    qb.where("name", "in", tags)
                })
                .fetchAll()
                .then(function(model) {
                    callback(model);
                })
                .catch(function (err) {
                    callback(null);
                });
        },

        insertMultiple: function(tags, callback) {
            callback = callback ? callback : function() {};
            var uniTagsToAdd = [];
            for(var i = 0; i < tags.length; ++i)
                uniTagsToAdd.push({name: tags[i]});

            knex('uni_tag').insert(uniTagsToAdd).then(function(d) {
                    //If we have more than 1 tag, make a query to grab IDs. MySQL doesn't
                    //return multiple IDs by design
                    if(uniTagsToAdd.length == 1)
                        callback({ models: [{id: d[0]}]});
                    else
                        UniTag.findByTag(tags, callback);
                });
        }
    });

module.exports = {
    Config: Config,
    User: User,
    UserArticleTag: UserArticleTag,
    Article: Article,
    ArticleBody: ArticleBody,
    FolderFile: FolderFile,
    TokenEmail: TokenEmail,
    TokenLogin: TokenLogin,
    UniTag: UniTag
};

