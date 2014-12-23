
var express = require('express');
var router = express.Router();
var auth = require('./../modules/auth');
var da = require('./../modules/data-access');

router.get('/articles/:skip/:amount', function(req, res) {
   res.json({});
});

module.exports = router;
