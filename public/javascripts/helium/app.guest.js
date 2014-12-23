
//Helper to serialize form data into a JSON object
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

String.prototype.slug = function() { // <-- removed the argument
    var str = this; // <-- added this statement

    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
};

//Main application
(function() {
    var app = angular.module("hel-app", ["hel-navbar", "hel-article", "hel-services"]);

    app.run(function ($rootScope) {
        $rootScope.$on('$locationChangeSuccess', function () {
            //console.log('$locationChangeSuccess changed!', new Date());
        });
    });

    app.directive("helFooter", function(){
        return {
            restrict: "E",
            templateUrl: "/templates/front/footer.html"
        };
    });

    app.directive("helAboutModal", function(){
        return {
            restrict: "E",
            templateUrl: "/templates/modals/about.html"
        };
    });

    app.directive("helContactModal", ["$http", function(){
        return {
            restrict: "E",
            templateUrl: "/templates/modals/contact.html",
            controller: function($http){
                var cThis = this;
                this.sender = {
                    email: "",
                    name: "",
                    message: ""
                };

                this.errorMsg = null;

                this.modal = function(args){
                    $("#contactModal").modal(args);
                };

                this.hasError = function() {
                    return this.errorMsg != null;
                };

                this.send = function() {
                    this.errorMsg = null;
                    //TODO Consider adding better email check here
                    if(this.sender.email == "" || this.sender.message == "" || this.sender.name == "" || this.sender.email.length < 3 || this.sender.email.indexOf("@") < 1)
                    {
                        this.errorMsg = "All fields are required.";
                        return;
                    }

                    $http.post('/data/contact/send', this.sender).
                        success(function(data, status, headers, config) {
                            if(data.code == 0) {
                                cThis.modal("hide");
                                cThis.sender.message = "";
                                $.notify("Message has been sent!", {autoHideDelay: 2000, globalPosition: 'top center', className: 'success'});
                            } else {
                                cThis.errorMsg = data.message;
                            }
                        }).
                        error(function(data, status, headers, config) {
                            cThis.errorMsg = "Sending failed. Status: " + status;
                        });
                };

                this.cancel = function() {
                    this.errorMsg = null;
                    //Reset the message only
                    //this.sender.email = "";
                    //this.sender.name = "";
                    this.sender.message = "";
                };
            },
            controllerAs: "contactCtrl"
        };
    }]);

    app.directive("helBody", ["hel-navbar-service", "hel-user-service", function(navbarService, userService){
        return {
            restrict: "E",
            templateUrl: "/templates/front/body.html",
            controller: function(){
                this.navbarService = navbarService;
                this.userService = userService;
            },
            controllerAs: "bodyCtrl"
        };
    }]);
})();