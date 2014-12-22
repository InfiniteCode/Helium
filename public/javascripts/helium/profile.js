
(function() {
    var profileModule = angular.module("hel-profile", ['hel-services']);

    profileModule.directive("helProfile", ["$http", "$timeout", "hel-user-service",
        function($http, $timeout, userService){
            return {
                restrict: "E",
                templateUrl: "/templates/profile.html",
                controller: function($scope){
                    var ctrlT = this;
                    this.userService = userService;
                    this.config = {
                        navbar: "",
                        general: {
                            title: "",
                            about: "",
                            terms: "",
                            privacy: "",
                            disqus: "",
                            tracking: ""
                        }
                    };

                    this.pass = {
                        old: "",
                        new: "",
                        conf: ""
                    };
                    this.user = {
                        nameFirst: "",
                        nameLast: "",
                        email: ""
                    };
                    this.errorPassMsg = null;
                    this.errorDetailsMsg = null;
                    this.errorNavbarCfgMsg = null;
                    this.errorGeneralCfgMsg = null;

                    this.hasNavbarError = function() {
                        return this.errorNavbarCfgMsg != null;
                    };

                    this.hasGeneralError = function() {
                        return this.errorGeneralCfgMsg != null;
                    };

                    this.hasPassError = function() {
                        return this.errorPassMsg != null;
                    };

                    this.hasDetailsError = function() {
                        return this.errorDetailsMsg != null;
                    };

                    $scope.$on('populateProfileDetails', function(event, args) {
                        ctrlT.user.nameFirst = userService.currentUser.nameFirst;
                        ctrlT.user.nameLast = userService.currentUser.nameLast;
                        ctrlT.user.email = userService.currentUser.email;
                        ctrlT.config.navbar = angular.toJson(config.navbar, true);

                        //Do only the first time
                        if(typeof ctrlT.config.general != "string") {
                            ctrlT.config.general.title = config.title;
                            ctrlT.config.general.about = config.about;
                            ctrlT.config.general.terms = config.terms;
                            ctrlT.config.general.privacy = config.privacy;
                            ctrlT.config.general.disqus = config.disqus;
                            ctrlT.config.general.tracking = config.tracking;
                            ctrlT.config.general = angular.toJson(ctrlT.config.general, true);
                        }
                    });

                    IsJsonString = function(str) {
                        try {
                            JSON.parse(str);
                        } catch (e) {
                            return false;
                        }
                        return true;
                    },

                    this.changeGeneralConfig = function() {
                        //Validate JSON first before submitting
                        if(!IsJsonString(this.config.general)) {
                            this.errorGeneralCfgMsg = "Not a valid JSON.";
                            return;
                        }

                        $http.post('/auth/config/general/change', {cfg: JSON.parse(this.config.general)}).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.errorGeneralCfgMsg = null;
                                    //about = ctrlT.config.general.about;
                                    //title = ctrlT.config.general.title;
                                    $.notify("General Config has been changed.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                } else {
                                    ctrlT.errorGeneralCfgMsg = data.message;
                                }
                            }).
                            error(function(data, status, headers, config) {
                                ctrlT.errorGeneralCfgMsg = "General Config change failed. Status: " + status;
                            });
                    };


                    this.changeNavbarConfig = function() {
                        //Validate JSON first before submitting
                        if(!IsJsonString(this.config.navbar)) {
                            this.errorNavbarCfgMsg = "Not a valid JSON.";
                            return;
                        }

                        $http.post('/auth/config/navbar/change', {cfg: this.config.navbar}).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.errorNavbarCfgMsg = null;
                                    config.navbar = JSON.parse(ctrlT.config.navbar);
                                    $.notify("Navbar Config has been changed.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                } else {
                                    ctrlT.errorNavbarCfgMsg = data.message;
                                }
                            }).
                            error(function(data, status, headers, config) {
                                ctrlT.errorNavbarCfgMsg = "Navbar Config change failed. Status: " + status;
                            });


                    };

                    this.changeDetails = function() {
                        //TODO Consider adding better email check here
                        if(!this.user.email || this.user.email.length < 3 || this.user.email.indexOf("@") < 1) {
                            this.errorDetailsMsg = "Email is not valid.";
                            return;
                        }

                        $http.post('/auth/details/change', this.user).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.errorDetailsMsg = null;
                                    userService.currentUser.nameFirst = ctrlT.user.nameFirst;
                                    userService.currentUser.nameLast = ctrlT.user.nameLast;
                                    userService.currentUser.email = ctrlT.user.email;
                                    $.notify("Details have been changed.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                } else {
                                    ctrlT.errorDetailsMsg = data.message;
                                }
                            }).
                            error(function(data, status, headers, config) {
                                ctrlT.errorDetailsMsg = "Details change failed. Status: " + status;
                            });
                    };

                    this.changePassword = function() {
                        if(this.pass.old == "") {
                            this.errorPassMsg = "Please enter your current password.";
                            return;
                        }

                        if(this.pass.new != this.pass.conf) {
                            this.errorPassMsg = "Passwords don't match.";
                            return;
                        }

                        if(this.pass.new == this.pass.old) {
                            this.errorPassMsg = "Your new and old passwords are the same.";
                            return;
                        }

                        //TODO Consider adding other password requirements for security reasons
                        if(this.pass.new.length < 6) {
                            this.errorPassMsg = "Password should be at least 6 characters.";
                            return;
                        }

                        $http.post('/auth/pass/change', {old: this.pass.old, new: this.pass.new}).
                            success(function(data, status, headers, config) {
                                if(data.code == 0) {
                                    ctrlT.errorPassMsg = null;
                                    ctrlT.pass.old = "";
                                    ctrlT.pass.new = "";
                                    ctrlT.pass.conf = "";
                                    $.notify("Password has been changed.", {autoHideDelay: 1000, globalPosition: 'top center', className: 'success'});
                                } else {
                                    ctrlT.errorPassMsg = data.message;
                                }
                            }).
                            error(function(data, status, headers, config) {
                                ctrlT.errorPassMsg = "Password change failed. Status: " + status;
                            });
                    };
                },
                controllerAs: "profileCtrl"
            };
        }]);

})();