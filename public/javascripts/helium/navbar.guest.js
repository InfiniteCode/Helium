
(function() {
    var navBarModule = angular.module("hel-navbar", ["hel-services"]);

    navBarModule.service("hel-navbar-service", function($location, $rootScope){
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
            return "/partial/article/" + id;
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