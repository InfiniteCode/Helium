
(function() {
    var editorModule = angular.module("hel-editor", ['ngSanitize', 'hel-services']);

    editorModule.filter('unsafe', function($sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    });

    editorModule.directive("helDeleteArticleModal", function() {
            return {
                restrict: 'E',
                templateUrl: "/templates/modals/article_delete.html",
                controller: function($scope){
                    var cThis = this;
                    var article = null;

                    this.modal = function(args){
                        $("#deleteArticleModal").modal(args);
                    };

                    this.deleteConfirmed = function() {
                        $scope.$emit('articleDeletionConfirmed', this.article);
                        cThis.modal("hide");
                    };

                    $scope.$on('showArticleDeleteModal', function(event, args) {
                        cThis.article = args;
                        cThis.modal();
                    });
                },
                controllerAs: "deleteArticleCtrl"
            };
        });

    editorModule.directive("helSaveArticleModal", function() {
            return {
                restrict: 'E',
                templateUrl: "/templates/modals/article_save.html",
                controller: function($scope){
                    var cThis = this;
                    var callbacks = null;

                    this.modal = function(args){
                        $("#saveArticleModal").modal(args);
                    };

                    this.saveConfirmed = function() {
                        cThis.modal("hide");
                        callbacks.onSaveConfirmed();
                    };

                    this.saveCancelled = function() {
                        cThis.modal("hide");
                        callbacks.onSaveCancelled();
                    };

                    $scope.$on('showArticleSaveModal', function(event, args) {
                        callbacks = args;
                        cThis.modal();
                    });
                },
                controllerAs: "saveArticleCtrl"
            };
        });

    editorModule.directive("helEditor", ["$http", "$timeout", "hel-user-service", "hel-navbar-service", function($http, $timeout, userService, navbarService){
        return {
            restrict: "E",
            templateUrl: "/templates/article/editor.html",
            controller: function($scope){
                var ctrlT = this;
                this.userService = userService;
                this.navbarService = navbarService;
                this.tabs = [
                    {
                        id: 0,
                        title: "Manage",
                        content: "/templates/article/editor_manager.html"
                    },
                    {
                        id: 1,
                        title: "Write",
                        content: "/templates/article/editor_write.html"
                    },
                    {
                        id: 2,
                        title: "Preview & Post",
                        content: "/templates/article/editor_preview.html"
                    }];
                this.currentTab = this.tabs[0].id;
                this.currentArticle = {};
                this.articles = [];

                this.deleteArticleByID = function(id) {
                    this.articles = this.articles.filter(function(obj) {
                        return obj.id != id;
                    });
                };

                this.getArticleByID = function(id) {
                    var grepRes = $.grep(this.articles, function(e){ return e.id == id; });
                    return grepRes.length > 0 ? grepRes[0] : null;
                };

                this.fetchArticles = function() {
                    $http.get('/editor/articles').
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.articles = data.articles;
                                } else {
                                    //$.notify("Articles fetching failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                                    $timeout(ctrlT.fetchArticles, 3000);
                                }
                            }).
                            error(function(data, status, headers, config) {
                                //$.notify("Articles fetching failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                                $timeout(ctrlT.fetchArticles, 3000);
                            });
                };

                this.closeArticle = function(requireConfirmation) {
                    if(jQuery.isEmptyObject(this.currentArticle)) return;
                    var requireConfirmation = typeof requireConfirmation == 'undefined' ? false : true;

                    //If !synced && draft - not saved to the backend!
                    if(this.currentArticle.modified == true && requireConfirmation) {
                        $scope.$emit("showArticleSaveModal", {
                                onSaveConfirmed: function() {
                                    ctrlT.saveArticle(function() {
                                        ctrlT.switchTab(0);
                                        ctrlT.currentArticle = {};
                                    });
                                },

                                onSaveCancelled: function() {
                                    ctrlT.switchTab(0);
                                    ctrlT.currentArticle.modified = false;
                                    ctrlT.currentArticle.synced = true;
                                    ctrlT.currentArticle = {};
                                }
                            });
                    } else {
                        this.switchTab(0);
                        ctrlT.currentArticle.modified = false;
                        ctrlT.currentArticle.synced = true;
                        this.currentArticle = {};
                    }
                }

                this.startDraft = function() {
                    this.closeArticle();

                    this.currentArticle = {
                        id: null,
                        url: "",
                        urlModified: "",
                        urlWIP: "",
                        title: "",
                        titleModified: "",
                        titleWIP: "",
                        language: "en",
                        body: {
                            original: "",
                            modified: "",
                            wip: ""
                        },
                        tags: {
                            original: [],
                            modified: [],
                            wip: []
                        },
                        status: "new", //draft, modified, published
                        modified: true,
                        synced: false,
                        options: {
                            original: {
                                private: false,
                                hidden: false,
                                comments: true
                            },
                            modified: {
                                private: false,
                                hidden: false,
                                comments: true
                            },
                            wip: {
                                private: false,
                                hidden: false,
                                comments: true
                            }
                        }
                    };

                    this.switchTab(1);
                };

                this.saveArticle = function(onSuccess, onFailure) {
                    if(!this.isArticleOpen()) return;

                    var onSuccess = typeof onSuccess == 'undefined' ? function(){} : onSuccess;
                    var onFailure = typeof onFailure == 'undefined' ? function(){} : onFailure;

                    this.currentArticle.body.wip = $('#summernote').code();
                    if(this.currentArticle.status == "new") {
                        //This is a new article, let's create it
                        $http.post('/editor/article/create', this.currentArticle).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.currentArticle.id = data.article.id;
                                    ctrlT.currentArticle.status = "draft";
                                    ctrlT.currentArticle.synced = true;
                                    ctrlT.currentArticle.modified = false;
                                    ctrlT.currentArticle.modifiedOn = data.article.modifiedOn;
                                    ctrlT.currentArticle.createdOn = data.article.createdOn;
                                    ctrlT.currentArticle.url = ctrlT.currentArticle.urlWIP;
                                    ctrlT.currentArticle.urlModified = ctrlT.currentArticle.urlWIP;
                                    ctrlT.currentArticle.title = ctrlT.currentArticle.titleWIP;
                                    ctrlT.currentArticle.titleModified = ctrlT.currentArticle.titleWIP;
                                    ctrlT.currentArticle.body.modified = ctrlT.currentArticle.body.wip;
                                    ctrlT.currentArticle.tags.modified = ctrlT.currentArticle.tags.wip;
                                    ctrlT.currentArticle.options.modified.private = ctrlT.currentArticle.options.wip.private;
                                    ctrlT.currentArticle.options.modified.hidden = ctrlT.currentArticle.options.wip.hidden;
                                    ctrlT.currentArticle.options.modified.comments = ctrlT.currentArticle.options.wip.comments;
                                    ctrlT.articles.push(ctrlT.currentArticle);
                                    $.notify("Saved", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                    onSuccess();
                                } else {
                                    $.notify("Saving failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                                    onFailure();
                                }
                            }).
                            error(function(data, status, headers, config) {
                                $.notify("Saving failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                                onFailure();
                            });

                    } else {
                        //Update existing article
                        $http.put('/editor/article/' + this.currentArticle.id, this.currentArticle).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    if(ctrlT.currentArticle.status == "published")
                                        ctrlT.currentArticle.status = "modified";
                                    ctrlT.currentArticle.synced = true;
                                    ctrlT.currentArticle.modified = false;
                                    ctrlT.currentArticle.modifiedOn = data.article.modifiedOn;
                                    ctrlT.currentArticle.url = data.article.url;
                                    ctrlT.currentArticle.urlModified = ctrlT.currentArticle.urlWIP;
                                    ctrlT.currentArticle.titleModified = ctrlT.currentArticle.titleWIP;
                                    ctrlT.currentArticle.body.modified = ctrlT.currentArticle.body.wip;
                                    ctrlT.currentArticle.tags.modified = ctrlT.currentArticle.tags.wip;
                                    ctrlT.currentArticle.options.modified.private = ctrlT.currentArticle.options.wip.private;
                                    ctrlT.currentArticle.options.modified.hidden = ctrlT.currentArticle.options.wip.hidden;
                                    ctrlT.currentArticle.options.modified.comments = ctrlT.currentArticle.options.wip.comments;
                                    $.notify("Saved", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                    onSuccess();
                                } else {
                                    $.notify("Saving failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                                    onFailure();
                                }
                            }).
                            error(function(data, status, headers, config) {
                                $.notify("Saving failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                                onFailure();
                            });
                    }
                };

                this.isArticleOpen = function() {
                    if(typeof this.currentArticle.body == 'undefined') return false;
                    //return !jQuery.isEmptyObject(this.currentArticle);
                    return true;
                };

                this.slug = function (text) {
                    return text.toLowerCase()
                            .replace(/ /g,'-')
                            .replace(/[^\w-]+/g,'');
                };

                this.permalink = function(title) {
                    var now = new Date();
                    var link = this.userService.currentUser.id + "/" + now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate() + "/" + this.slug(title);
                    return link;
                }

                this.articleTitleChanged = function() {
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;

                    //Automatically update permalink if we modify the title, but only
                    //if article hasn't been published yet
                    if(this.currentArticle.status != "published") {
                        this.generatePermalink();
                    }
                };

                this.generatePermalink = function() {
                    var link = this.permalink(this.currentArticle.titleWIP);
                    this.currentArticle.urlWIP = link;
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;
                };

                this.articlePermalinkChanged = function() {
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;
                };

                this.articleOptionChanged = function() {
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;
                };

                this.articleTagsChanged = function() {
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;
                };

                this.articleBodyChanged = function() {
                    this.currentArticle.body.wip = $('#summernote').code();
                    this.currentArticle.modified = true;
                    this.currentArticle.synced = false;
                };

                this.articleTagsSuggestion = function(q){
                    return $http.get('/editor/tags/' + q);
                }

                this.getArticleListTitle = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return "Unknown";

                    return article.status == "published" ? article.title : article.titleModified;
                };

                this.getArticleListHidden = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return false;

                    return article.status == "published" ? article.options.original.hidden : article.options.modified.hidden;
                };

                this.getArticleListPrivate = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return false;

                    return article.status == "published" ? article.options.original.private : article.options.modified.private;
                };

                this.getArticleListComments = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return false;

                    return article.status == "published" ? article.options.original.comments : article.options.modified.comments;
                };

                this.editArticleImp = function(article) {
                    $http.get('/editor/article/' + article.id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                article.body = data.article.body;
                                article.tags = data.article.tags;
                                article.body.wip = article.status == "published" ? article.body.original : article.body.modified;
                                article.titleWIP = article.status == "published" ? article.title : article.titleModified;
                                article.urlWIP = article.status == "published" ? article.url : article.urlModified;
                                article.tags.wip = article.status == "published" ? article.tags.original : article.tags.modified;
                                article.options.wip = article.status == "published" ? article.options.original : article.options.modified;
                                ctrlT.currentArticle = article;
                                $("#filesImageUrlInput").val("");
                                ctrlT.switchTab(1);
                            } else {
                                $.notify("Opening failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Opening failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                        });
                };

                this.editArticle = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return;
                    if(this.currentArticle.id == article.id) {
                        this.switchTab(1);
                        return;
                    }

                    if(this.isArticleOpen() && this.currentArticle.modified) {
                        $scope.$emit('showArticleSaveModal',
                            {
                                onSaveConfirmed: function() {
                                    ctrlT.saveArticle(function() {
                                        ctrlT.editArticleImp(article);
                                    });
                                },

                                onSaveCancelled: function() {
                                    ctrlT.currentArticle.modified = false;
                                    ctrlT.currentArticle.synced = true;
                                    ctrlT.editArticleImp(article);
                                }
                            });
                    } else {
                        this.editArticleImp(article);
                    }
                };

                this.postArticle = function(id, bringUp) {
                    var bringUp = bringUp ? bringUp : false;
                    var article = this.getArticleByID(id);
                    if(article == null) return;

                    var publishUrl = '/editor/article/' + (bringUp ? 'publishup/' : 'publish/');
                    $http.get(publishUrl + id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                article.title = data.article.title;
                                article.url = data.article.url;
                                article.status = data.article.status;
                                article.publishedOn = data.article.publishedOn;
                                article.options.original.hidden = data.article.hidden;
                                article.options.original.private = data.article.private;
                                article.options.original.comments = data.article.comments;
                                if(ctrlT.currentArticle.id == article.id) ctrlT.closeArticle();

                                $.notify("Your article is now published.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                            } else {
                                $.notify("Publishing failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Publishing failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                        });
                };

                this.rollbackArticle = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return;

                    $http.get('/editor/article/rollback/' + id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                article.title = data.article.title;
                                article.options.original.hidden = data.article.hidden;
                                article.options.original.private = data.article.private;
                                article.options.original.comments = data.article.comments;
                                article.title = data.article.title;
                                article.url = data.article.url;
                                article.status = data.article.status;
                                article.modifiedOn = article.publishedOn;
                                if(ctrlT.currentArticle.id == article.id) ctrlT.closeArticle();

                                $.notify("Your changes were cancelled.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                            } else {
                                $.notify("Changes rollback failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Changes rollback failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                        });
                };

                this.deleteArticle = function(id) {
                    var article = this.getArticleByID(id);
                    if(article == null) return;
                    $scope.$emit('showArticleDeleteModal', article);
                };

                $scope.$on('articleDeletionConfirmed', function(event, args) {
                    //Delete existing article
                    var article = args;
                    $http.delete('/editor/article/' + article.id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                if(ctrlT.currentArticle.id == data.article.id)
                                    ctrlT.closeArticle();

                                ctrlT.deleteArticleByID(data.article.id);
                                $.notify("Deleted", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                            } else {
                                $.notify("Deletion failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Deletion failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                        });
                });


                this.allowTab = function(tabID) {
                    switch(tabID){
                    case 0: return true;
                    case 1: return this.isArticleOpen();
                    case 2: return this.isArticleOpen();
                    }

                    return false;
                };

                this.pasteBodycut = function() {
                    var targetInputName = "filesImageUrlInput";//hardcoded for now
                    var targetEl = $("#" + targetInputName);
                    targetEl.val('<h2 class="bodycut">&nbsp;</h2>');
                    targetEl.focus();
                    targetEl.select();
                };

                this.getTabByTitle = function(title) {
                    var grepRes = $.grep(this.tabs, function(e){ return e.title == title; });
                    return grepRes.length > 0 ? grepRes[0] : null;
                };
                this.getTabByID = function(id) {
                    var grepRes = $.grep(this.tabs, function(e){ return e.id == id; });
                    return grepRes.length > 0 ? grepRes[0] : null;
                };

                this.switchTab = function(tab) {
                    //Don't allow switching if we have no articles
                    if(!this.isArticleOpen()) return;

                    var curTab = this.currentTab;
                    if(typeof tab == 'string') {
                        var foundTab = this.getTabByTitle(tab);
                        if(foundTab != null)
                            this.currentTab = foundTab.id;
                    } else
                        this.currentTab = tab;

                    if(curTab != this.currentTab)
                    {
                        this.onTabLeave(curTab);
                        this.onTabEnter(this.currentTab);
                    }
                };

                this.uploadImage = function(files, editor, welEditable) {

                    var a = 5;
                    a ++;
                };

                this.onTabLeave = function(id) {
                    var tab = this.getTabByID(id);
                    switch(id) {
                    case 1: {
                            $('#summernote').destroy();
                        } break;
                    }
                };

                this.onTabEnter = function(id) {
                    var tab = this.getTabByID(id);
                    switch(id) {
                    case 2: {
                        if(!this.currentArticle.modified)
                        {
                            if(this.currentArticle.status == "published")
                                this.currentArticle.body.wip = this.currentArticle.body.original;
                            else
                                //For drafts and modified ones
                                this.currentArticle.body.wip = this.currentArticle.body.modified;
                        }
                    } break;
                    case 1: {
                            var noteEl = $('#summernote');
                            noteEl.summernote({
                                height: 500,
                                minHeight: 200,
                                maxHeight: null,
                                focus: true,
                                onChange: function(contents, $editable) {
                                    $scope.$apply(function(){
                                        ctrlT.articleBodyChanged();
                                        });
                                },
                                onImageUpload: function(files, editor, welEditable) {
                                    ctrlT.uploadImage(files, editor, welEditable);
                                },
                                oninit: function() {
                                }

                            });

                        if(!this.currentArticle.modified)
                        {
                            if(this.currentArticle.status == "published")
                                noteEl.code(this.currentArticle.body.original);
                            else
                                //For draft and modified ones
                                noteEl.code(this.currentArticle.body.modified);
                        } else
                            noteEl.code(this.currentArticle.body.wip);
                        } break;
                    }
                };

                this.getPreviewAuthorName = function() {
                    if(!this.userService.isSignedIn()) return "John Doe";
                    return this.userService.currentUser.nameFirst + " " + this.userService.currentUser.nameLast;
                };

                this.getPreviewTags = function() {
                    if(typeof this.currentArticle.tags == 'undefined') return "";

                    var tags = "";
                    for(var i = 0; i < this.currentArticle.tags.wip.length; ++i) {
                        tags += this.currentArticle.tags.wip[i].text;
                        if(i != this.currentArticle.tags.wip.length - 1) tags += ", ";
                    }

                    return tags;
                };

                this.getPreviewWhenAndWho = function() {
                    var d = new Date();
                    return "On " + d.toString("MMM d, yyyy") + " by " + this.getPreviewAuthorName() + " at " + d.toString("hh:mm");
                };

                this.dateFromMillis = function(millis) {
                    var d = new Date(millis);
                    return d.toString("d MMM yyyy");
                };

                this.timeFromMillis = function(millis) {
                    var d = new Date(millis);
                    return d.toString("hh:mm:ss")
                };

                $timeout(ctrlT.fetchArticles, 100);
            },
            controllerAs: "editorCtrl"
        };
    }]);

})();