
(function() {
    var navBarModule = angular.module("hel-navbar", ["hel-services"]);

    navBarModule.service("hel-navbar-service", function($location, $rootScope){
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
            return "/partial/article/" + id;
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
                    //TODO Consider making this more user friendly
                    $("#dynamicContent").empty();
                };

                this.files = function() {
                    navbarService.showFiles(true);
                    //TODO Consider making this more user friendly
                    $("#dynamicContent").empty();
                };

                this.profile = function() {
                    navbarService.showProfile(true);
                    $scope.$emit('populateProfileDetails');
                    //TODO Consider making this more user friendly
                    $("#dynamicContent").empty();
                }
            },
            controllerAs: "navbarUserCtrl"
        };
    }]);
})();