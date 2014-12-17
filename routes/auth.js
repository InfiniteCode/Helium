
var express = require('express');
var router = express.Router();
var auth = require('./../modules/auth');
var da = require('./../modules/data-access');

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};


router.post('/signin', function(req, res) {
    if(!req.body.email || !req.body.password) {
        res.status(400);
        res.send("Invalid Request");
    } else
        auth.signIn(req.body.email, req.body.password, { ip4: req.connection.remoteAddress }, function(data, sk) {
            if(data.code == 0) {
                //TODO Add remember checkbox and check req.body.remember
                res.cookie('email', sk.cookies.email, { maxAge: 900000, httpOnly: true });
                res.cookie('token', sk.cookies.token, { maxAge: 900000, httpOnly: true });

                req.session.email = sk.session.email;
                req.session.userId = sk.session.id;
                req.session.access = sk.session.access;
            }
            res.json(data);
        });
});

router.get('/signout', function(req, res) {
    req.session.destroy();

    if(req.cookies.email && req.cookies.token) {
        auth.signOut(req.cookies.email, req.cookies.token, function(){
            res.clearCookie('email');
            res.clearCookie('token');
            res.json({ code: 0 });
        });
    } else {
        res.json({ code: 0 }); //No data stored in cookies
    }
});

router.post('/pass/change', function(req, res) {
    if(!req.session || !req.session.userId)
        res.json({code: -1, message: "Invalid user."});
    else {
        var oldPass = req.body.old;
        var newPass = req.body.new;
        if(newPass.length < 6)
            res.json({code: -2, message: "Password must be at least 6 symbols."});
        else {
            auth.changePassword(oldPass, newPass, req.session.userId, function(d) {
                res.json(d);
            });
        }
    }
});

router.post('/details/change', function(req, res) {
    if(!req.session || !req.session.userId)
        res.json({code: -1, message: "Invalid user."});
    else {
        //TODO Consider adding better email check here
        if(req.body.email.length < 3 || req.body.email.indexOf("@") < 1)
            res.json({code: -5, message: "Invalid email."});
        else
            auth.changeDetails(req.body, req.session.userId, function(d) {
                res.json(d);
            });
    }
});

router.post('/config/navbar/change', function(req, res) {
    //TODO This is a critical place! Add check for the user level and permissions
    if(!req.session || !req.session.userId)
        res.json({code: -1, message: "Invalid user."});
    else {
        da.Config.getNavbarConfig(function(cfg) {
            //TODO Consider creating a new entry if there is none in DB
            if(cfg == null)
                res.json({code: -2, message: "No DB Config entry for navbar."});
            else
            {
                if(!IsJsonString(req.body.cfg))
                    res.json({code: -3, message: "Not a valid JSON config."});
                else {
                    cfg.attributes["data"] = req.body.cfg;
                    cfg.save().then(function() { res.json({code: 0}); });
                }
            }
        });
    }
});

router.post('/config/general/change', function(req, res) {
    //TODO This is a critical place! Add check for the user level and permissions
    if(!req.session || !req.session.userId)
        res.json({code: -1, message: "Invalid user."});
    else {
        da.Config.getConfigs(function(cfg) {
            //TODO Consider creating a new entry if there is none in DB
            if(cfg == null)
                res.json({code: -2, message: "No DB entries for general config."});
            else
            {
                if(typeof req.body.cfg.title != "string" || typeof req.body.cfg.about != "number")
                    res.json({code: -3, message: "Not a valid JSON config."});
                else {
                    for(var i = 0, len = cfg.length; i < len; ++i)
                    switch(cfg[i].id) {
                        case "title": { cfg[i].attributes["data"] = req.body.cfg.title; cfg[i].save().then(function(){})} break;
                        case "about": { cfg[i].attributes["data"] = req.body.cfg.about; cfg[i].save().then(function(){})} break;
                        case "terms": { cfg[i].attributes["data"] = req.body.cfg.terms; cfg[i].save().then(function(){})} break;
                        case "privacy": { cfg[i].attributes["data"] = req.body.cfg.privacy; cfg[i].save().then(function(){})} break;
                        case "disqus": { cfg[i].attributes["data"] = req.body.cfg.disqus; cfg[i].save().then(function(){})} break;
                    }

                    res.json({code: 0});
                }
            }
        });
    }
});

module.exports = router;
