
var nconf = require("nconf");

var aws = require("aws-sdk");
aws.config.update({accessKeyId: nconf.get("mail").user, secretAccessKey: nconf.get("mail").pass, region: nconf.get("mail").region});
var ses = new aws.SES({apiVersion: '2010-12-01'});

var Mailer = {
    serviceConf: nconf.get("mail").service,

    sendServiceEmail: function(from, title, body) {
        Mailer.sendEmail(this.serviceConf.to, this.serviceConf.from, title, body, from);
    },

    sendEmail: function(to, from, title, body, replyTo) {
        // TODO Add HTML version
        ses.sendEmail( {
            Source: from,
            Destination: { ToAddresses: [to] },
            ReplyToAddresses: [replyTo],
            Message: {
                Subject: {
                    Data: title
                },
                Body: {
                    Text: {
                        Data: body
                    }
                }
            }
        }, function(err, data) {
            if(err) console.error(err);
        });
    }
};

module.exports = Mailer;


