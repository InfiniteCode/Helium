
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