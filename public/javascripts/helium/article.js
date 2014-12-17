
(function() {
    var articleModule = angular.module("hel-article", ['ngSanitize']);

    articleModule.filter('unsafe', function($sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    });

    articleModule.directive("helArticle", ["$http", "$timeout", function($http, $timeout){
        return {
            restrict: "E",
            templateUrl: "/templates/article/article.html",
            controller: function(){
                var ctrlT = this;
                var fetchTries = 10;
                var fetchCutTries = 10;
                this.init = function(article, authors) {
                    this.article = article;
                    this.authors = authors;
                    this.fetchBody();
                };

                this.getWhenAndWho = function() {
                    var d = new Date(this.article.publishedOn)
                    return "On " + d.toString("MMM d, yyyy") + " by " + this.getAuthorName() + " at " + d.toString("hh:mm");
                };

                this.getTags = function() {
                    if(typeof this.article.tags == 'undefined') return "";
                    return this.article.tags.original.join(", ");
                };

                this.getAuthorName = function() {
                    if(typeof this.authors[this.article.author] == 'undefined' ||
                        this.authors[this.article.author].complete == false) return "John Doe";

                    return this.authors[this.article.author].nameFirst + " " + this.authors[this.article.author].nameLast;
                };

                this.fetchBodyCut = function($event) {
                    this.fetchCutTries = this.fetchCutTries - 1;
                    if(this.fetchCutTries == 0) {
                        this.article.body += " Can't load article body. Something went wrong ;(";
                        this.article.isCut = false;
                        return;
                    }

                    $http.get("/article/cut/" + this.article.id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                ctrlT.article.body += data.article.bodycut;
                                ctrlT.article.isCut = false;
                            } else
                                $timeout(fetchBodyCut, 1000);
                        }).
                        error(function(data, status, headers, config) {
                            $timeout(fetchBodyCut, 1000);
                        });
                };

                this.fetchBody = function() {
                    this.fetchTries = this.fetchTries - 1;
                    if(this.fetchTries == 0) {
                        this.article.body = "Something went wrong ;(";
                        this.article.tags = { original: [] };
                        return;
                    }

                    $http.get("/article/" + this.article.id).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                ctrlT.article.body = data.article.body;
                                ctrlT.article.tags = data.article.tags;
                                ctrlT.article.isCut = data.article.isCut;
                            } else
                                $timeout(fetchBody, 1000);
                        }).
                        error(function(data, status, headers, config) {
                            $timeout(fetchBody, 1000);
                        });
                };
            },
            controllerAs: "articleCtrl"
        };
    }]);

    articleModule.directive("helBlog", ["$http", "$timeout", function($http, $timeout){
        return {
            restrict: "E",
            templateUrl: "/templates/front/blog.html",
            controller: function($scope){
                var ctrlT = this;
                this.articles = [];
                this.authors = {};
                this.fetchingArticles = false;
                this.fetchAmount = 10;

                this.fetchAuthor = function(id) {
                    if(typeof this.authors[id] != "undefined" && (this.authors[id].complete == true || this.authors[id].fetching == true)) return;

                    if(typeof this.authors[id] == "undefined") {
                        this.authors[id] = {};
                        this.authors[id].tries = 3;
                        this.authors[id].complete = false;
                    }

                    this.authors[id].tries -= 1;
                    if(this.authors[id].tries == 0) {
                        this.authors[id].complete = true;
                        this.authors[id].nameFirst = "John";
                        this.authors[id].nameLast = "Doe";
                    } else {
                        this.authors[id].fetching = true;
                        $http.get("/author/" + id).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.authors[id].nameFirst = data.author.nameFirst;
                                    ctrlT.authors[id].nameLast = data.author.nameLast;
                                    ctrlT.authors[id].complete = true;
                                } else {
                                    $timeout(function() { ctrlT.fetchAuthor(id); }, 3000);
                                }
                            }).
                            error(function(data, status, headers, config) {
                                $timeout(function() { ctrlT.fetchAuthor(id); }, 3000);
                            });
                    }
                };

                this.fetchPosts = function(startingFrom, amount) {
                    if(this.fetchingArticles) return;
                    this.fetchingArticles = true;

                    $http.get("/articles/" + startingFrom + "/" + amount).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                if(data.articles.length == 0) return; //No more articles

                                ctrlT.articles = ctrlT.articles.concat(data.articles);
                                //Check if there are new authors in the list and add them
                                for(var ai = 0; ai < data.articles.length; ++ai)
                                    if(typeof ctrlT.authors[data.articles[ai].author] == "undefined")
                                        ctrlT.fetchAuthor(data.articles[ai].author);

                                ctrlT.fetchingArticles = false;

                            } else {
                                $.notify("Articles fetching failed. Code " + data.code + ". " + data.message, {globalPosition: 'top center', className: 'error'});
                                $timeout(function() { ctrlT.fetchPosts(amount, startingFrom); }, 3000);
                                ctrlT.fetchingArticles = false;
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Articles fetching failed. Code " + status, {globalPosition: 'top center', className: 'error'});
                            $timeout(function() { ctrlT.fetchPosts(amount, startingFrom); }, 3000);
                            ctrlT.fetchingArticles = false;
                        });
                };

                $timeout(function() { ctrlT.fetchPosts(ctrlT.articles.length, ctrlT.fetchAmount); }, 1);

                window.onscroll = function(ev) {
                    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
                        ctrlT.fetchPosts(ctrlT.articles.length, ctrlT.fetchAmount);
                    }
                };
            },
            controllerAs: "blogCtrl"
        };
    }]);

})();