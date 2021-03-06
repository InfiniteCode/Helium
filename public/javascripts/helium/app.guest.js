
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

//Main application
(function() {
    var app = angular.module("hel-app", ["hel-navbar", "hel-services"]);

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

})();