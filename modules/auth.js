
var crypto = require("crypto");
var da = require("./data-access");

function validLoginResponse(user, token) {
    var userEmail = user.get("email");
    return {
        user:
        {
            code: 0,
            email: userEmail,
            nameFirst: user.get("name_first"),
            nameLast: user.get("name_last"),
            access: user.get("level")
        },
        extra:
        {
            session: {
                email: userEmail,
                id: user.get("id"),
                access: user.get("level")
            },
            cookies: {
                token: token,
                email: userEmail
            }
        }
    };
};

var Auth =
{
    randomSalt: function() {
        var token;
        crypto.randomBytes(32, function(ex, buf) { token = buf.toString('hex'); });
        return token;
    },

    randomToken: function(text, key) {
        return crypto.createHmac('sha1', key).update(text).digest('hex');
    },

    hashifyPassword: function(text, key) {
        return crypto.createHmac('sha1', key).update(text).digest('hex');
    },

    ipToInt: function(ip) {
        var parts = ip.split(".");
        var res = 0;

        res += parseInt(parts[0], 10) << 24;
        res += parseInt(parts[1], 10) << 16;
        res += parseInt(parts[2], 10) << 8;
        res += parseInt(parts[3], 10);

        return res;
    },

    intToIp: function(i) {
        var p1 = i & 255;
        var p2 = ((i >> 8) & 255);
        var p3 = ((i >> 16) & 255);
        var p4 = ((i >> 24) & 255);

        return p4 + "." + p3 + "." + p2 + "." + p1;
    },

    changeDetails: function(details, userId, callback) {
        callback = callback ? callback : function() {};
        da.User.findById(userId, function(user) {
            if(user == null) {
                callback({code: -2, message: "Invalid user."});
            } else {
                if(user.get("email") == details.email) {
                    //Change only first and last names
                    user.attributes["name_first"] = details.nameFirst;
                    user.attributes["name_last"] = details.nameLast;
                    user.save().then(function() { callback({code: 0}); });
                } else {
                    //if we change email we need to make sure no such other user exists in DB
                    da.User.findByEmail(details.email, function(userOther) {
                        if(userOther != null) {
                            callback({code: -3, message: "There is another user with such email registered."});
                        } else {
                            user.attributes["name_first"] = details.nameFirst;
                            user.attributes["name_last"] = details.nameLast;
                            user.attributes["email"] = details.email;
                            user.save().then(function() { callback({code: 0}); });
                        }
                    });
                }
            }
        });
    },

    changePassword: function(oldPass, newPass, userId, callback) {
        callback = callback ? callback : function() {};
        da.User.findById(userId, function(user) {
            if(user == null) {
                callback({code: -3, message: "Invalid user."});
            } else {
                var oldPassHash = Auth.hashifyPassword(oldPass, user.get("pass_salt"));
                if (oldPassHash == user.get("pass_hash")) {
                    var newPassHash = Auth.hashifyPassword(newPass, user.get("pass_salt"));
                    user.attributes["pass_hash"] = newPassHash;
                    user.save().then(function() {
                        callback({code: 0});
                    });
                } else {
                    callback({code: -4, message: "Invalid current password."});
                }
            }
        });
    },

    tokenSignIn: function(email, token, callback) {
        callback = callback ? callback : function() {};
        da.TokenLogin.findByToken(token, function(entry) {
            if(entry == null)
                callback({ code: -1, message: "Invalid token." });
            else {
                var user = entry.related('user');
                if(user == null)
                    callback({ code: -2, message: "Invalid user." });
                else {
                    if(user.id == entry.get('user')) {
                        var res = validLoginResponse(user, token);
                        callback(res.user, res.extra);
                    } else {
                        callback({code: -3, message: "Token doesn't match user."});
                    }
                }
            }
        })
    },

    signIn: function(email, pass, extra, callback) {
        callback = callback ? callback : function() {};
        da.User.findByEmail(email, function(user) {
            if(user == null)
                callback({code: -1, message: "Email or password is incorrect."});
            else {
                //TODO Consider hashing the password on the client side
                var formPassHash = Auth.hashifyPassword(pass, user.get("pass_salt"));
                if (formPassHash == user.get("pass_hash")) {
                    //Successful login, generate new token and add it to the table
                    var now = new Date();
                    var loginToken = Auth.randomToken(email, now.getTime().toString() );
                    da.TokenLogin.forge(
                        {
                            user: user.get("id"),
                            token: loginToken,
                            date: now,
                            ip4: extra ? Auth.ipToInt(extra.ip4) : null

                        }).save(); //TODO Consider waiting until the entry is actually written and check with .then( ...

                    var res = validLoginResponse(user, loginToken);
                    callback(res.user, res.extra);
                } else
                    callback(
                        {
                            code: -2,
                            message: "Email or password is incorrect."
                        });
            }
        });
    },

    signOut: function(email, token, callback) {
        callback = callback ? callback : function() {};
        //TODO Consider checking both email and token, there theoretically might be collisions if just token
        da.TokenLogin.deleteByToken(token, callback);
    }

};

module.exports = Auth;
