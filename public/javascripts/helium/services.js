
//Services
(function() {
    var services = angular.module("hel-services", []);

    services.service("hel-user-service", function(){
        this.currentUser = { };

        this.isSignedIn = function() {
            return !jQuery.isEmptyObject(this.currentUser);
        };

        this.signIn = function(userData) {
            this.currentUser = userData;
        };

        this.signOut = function() {
            this.currentUser = {};
        };

        this.autoSignIn = function() {
            if(typeof autoLoginData != "undefined") {
                this.currentUser = autoLoginData;
            }
        };

        //Give it a try!
        this.autoSignIn();
    });
})();