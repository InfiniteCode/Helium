
(function() {
    var navBarModule = angular.module("hel-navbar", ["hel-services"]);

    navBarModule.service("hel-navbar-service", function($location, $rootScope){
        var nbm = this;
        $rootScope.$on('$locationChangeSuccess', function () {
            var url = $location.path();
            var parts = url.split('/');
            var loadContent = function() {
                if(document.getElementById("dynamicContent") == null) {
                    //We need to make sure our dynamic block is already created, so delay
                    //execution if needed
                    setTimeout(loadContent, 50);
                } else {
                    if(url.indexOf("/r/") == 0)
                        nbm.openArticle(url);
                    else
                        nbm.setCurrentPage(parts[1], parts[2]);
                }
            };

            loadContent();
        });

        this.pages = config.navbar;
        this.currentPage = this.pages[0];
        this.currentSubPage = null;
        this.articleOn = false;

        this.simplePages = function(){
            return $.grep(this.pages, function(p) { return p.type == 1; });
        };

        this.hideAll = function() {
            this.currentPage = null;
            this.articleOn = false;
        };

        this.blogOn = function() {
            return this.currentPage == "Read";
        };

        this.getArticleContentUrl = function(id) {
            return "/raw/article/" + id;
        };

        this.openArticle = function(url) {
            this.hideAll();
            this.articleOn = true;
            pageId = null;
            subPageId = null;
            $( "#dynamicContent" ).empty();
            $( "#dynamicContent" ).load(url);
        };

        this.setCurrentPage = function(pageId, subPageId) {
            this.hideAll();
            //TODO Loading should be logically in Blog Controller, maybe
            //add global notification that will be catched there and load content

            if(pageId == "terms-of-use" || pageId == "privacy-policy") {
                var id = pageId == "terms-of-use" ? config.terms : config.privacy;
                pageId = null;
                subPageId = null;
                this.articleOn = true;

                $( "#dynamicContent" ).empty();
                $( "#dynamicContent" ).load( this.getArticleContentUrl(id));
                return;
            }

            if(!pageId && !subPageId)
                pageId = this.pages[0].id.slug();

            for(var i = 0, len = this.pages.length; i < len; ++i)
                if(this.pages[i].id.slug() == pageId)
                    switch(this.pages[i].type) {
                        case 0: this.currentPage = this.pages[i]; break;
                        case 1: {
                            this.currentPage = this.pages[i];
                            $( "#dynamicContent" ).empty();
                            $( "#dynamicContent" ).load( this.getArticleContentUrl(this.currentPage.article));
                        } break;
                        case 2: {
                            this.currentPage = this.pages[i];
                            var subEntries = this.pages[i].entries;
                            for(var j = 0, jlen = subEntries.length; j < jlen; ++j)
                                if(subEntries[j].id.slug() == subPageId) {
                                    this.currentSubPage = subEntries[j];
                                    //Load content into the dynamic block
                                    $( "#dynamicContent" ).empty();
                                    $( "#dynamicContent" ).load( this.getArticleContentUrl(this.currentSubPage.article));
                                }
                        } break;
                    }
        };

        this.isCurrentPageDynamic = function() {
            return (this.currentPage != null && this.currentPage.type != 0) || this.articleOn;
        };

        this.isCurrentPage = function(pageId) {
            return this.currentPage != null && this.currentPage.id == pageId;
        };

        this.getCurrentPageType = function() {
            if(this.currentPage == null) return -1;
            return this.currentPage.type;
        };
    });

    navBarModule.directive("helNavbarGuest", ["hel-user-service", function(userService){
        return {
            restrict: "E",
            templateUrl: "/templates/front/navbar_menu_guest.html",
            controller: function($scope){
                this.userService = userService;
                this.showSignInModal = function(show) {
                    show = typeof show === 'undefined' || show == null || show == false || show == "hide" ? "hide" : "show";
                    $scope.$emit('showSignInModal', show);
                };
            },
            controllerAs: "navbarGuestCtrl"
        };
    }]);

    navBarModule.directive("helNavbar", ["hel-navbar-service", "hel-user-service", function(navbarService, userService){
        return {
            restrict: "E",
            templateUrl: "/templates/front/navbar.html",
            controller: function(){
                this.navbarService = navbarService;
                this.userService = userService;
            },
            controllerAs: "navbarCtrl"
        }
    }]);

    navBarModule.directive("helSigninModal", ["$http", "hel-user-service", function($http, userService) {
        return {
            restrict: 'E',
            templateUrl: "/templates/modals/signin.html",
            controller: function($scope){
                var cThis = this;
                this.errorMsg = null;
                this.email = null;
                this.password = null;

                this.setError = function(msg) {
                    this.errorMsg = msg;
                };

                this.hasError = function() {
                    return this.errorMsg != null;
                };

                this.modal = function(args){
                    $("#signinModal").modal(args);
                };

                this.signIn = function() {
                    var $form = $("#form-signin");
                    var ctrl = this;
                    $http.post('/auth/signin', $form.serializeObject()).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                ctrl.setError(null);
                                userService.signIn(data);
                                cThis.modal("hide");
                                window.location = "/";
                            } else {
                                ctrl.setError(data.message);
                            }
                        }).
                        error(function(data, status, headers, config) {
                            ctrl.setError("Sign in error. Code " + status);
                        });
                };

                $scope.$on('showSignInModal', function(event, args) {
                    cThis.setError(null);
                    cThis.email = null;
                    cThis.password = null;
                    cThis.modal(args);
                });
            },
            controllerAs: "signinCtrl"
        };
    }]);
})();