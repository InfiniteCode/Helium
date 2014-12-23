
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
        this.editorOn = false;
        this.filesOn = false;
        this.profileOn = false;
        this.articleOn = false;

        this.simplePages = function(){
            return $.grep(this.pages, function(p) { return p.type == 1; });
        };

        this.hideAll = function() {
            this.editorOn = false;
            this.filesOn = false;
            this.profileOn = false;
            this.articleOn = false;
            this.currentPage = null;
            this.currentSubPage = null;
        };

        this.showEditor = function(show) {
            this.hideAll();
            this.editorOn = show;
            if(show == true) this.currentPage = this.pages[0];
        };

        this.showFiles = function(show) {
            this.hideAll();
            this.filesOn = show;
            if(show == true) this.currentPage = this.pages[0];
        };

        this.showProfile = function(show) {
            this.hideAll();
            this.profileOn = show;
            if(show == true)
                this.currentPage = this.pages[0];
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
            if(this.editorOn || this.filesOn || this.profileOn) return false;

            return (this.currentPage != null && this.currentPage.type != 0) || this.articleOn;
        };

        this.isCurrentPage = function(pageId) {
            return this.currentPage != null && this.currentPage.id == pageId &&
                !this.editorOn && !this.filesOn && !this.profileOn;
        };

        this.getCurrentPageType = function() {
            if(this.editorOn || this.filesOn || this.profileOn || this.currentPage == null) return -1;
            return this.currentPage.type;
        };
    });

    navBarModule.directive("helNavbar", ["hel-navbar-service", "hel-user-service", function(navbarService, userService){
        return {
            restrict: "E",
            templateUrl: "/templates/front/navbar.html",
            controller: function($rootScope){
                this.navbarService = navbarService;
                this.userService = userService;
            },
            controllerAs: "navbarCtrl"
        }
    }]);

    navBarModule.directive("helNavbarUser", ["$http", "hel-user-service", "hel-navbar-service", function($http, userService, navbarService){
        return {
            restrict: "E",
            templateUrl: "/templates/front/navbar_menu_user.html",
            controller: function($scope){
                this.navbarService = navbarService;
                this.userService = userService;
                this.signOut = function() {

                    $http.get('/auth/signout').
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                userService.signOut();
                                navbarService.showEditor(false);
                                navbarService.showFiles(false);
                                $.notify("Signed out", {autoHideDelay: 2000, globalPosition: 'top center', className: 'success'});
                                window.location = "/";
                            } else {
                                $.notify(data.message, {autoHideDelay: 2000, globalPosition: 'top center', className: 'error'});
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $.notify("Sign out error. Code " + status, {autoHideDelay: 2000, globalPosition: 'top center', className: 'error'});
                        });
                };

                this.write = function() {
                    navbarService.showEditor(true);
                };

                this.files = function() {
                    navbarService.showFiles(true);
                };

                this.profile = function() {
                    navbarService.showProfile(true);
                    $scope.$emit('populateProfileDetails');
                }
            },
            controllerAs: "navbarUserCtrl"
        };
    }]);
})();