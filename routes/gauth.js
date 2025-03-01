"use strict";

var express = require('express');
var router = express.Router();
var secrets = require(__dirname + '/../secrets.json');
var gapi = require('googleapis');

var oauth2Client =
  new gapi.auth.OAuth2(
    secrets.web.client_id,
    secrets.web.client_secret,
    secrets.web.redirect_uris[0]);

router.post('/login', function(req, res) {
  var options = {
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ')
  };
  var generatedUrl = oauth2Client.generateAuthUrl(options);
  res.redirect(generatedUrl);
});

router.get('/oauth2callback', function(req, res) {
  var code = req.query.code;
  if(code) {
    req.session.code = code;
    oauth2Client.getToken(code, function(err, tokens) {
      if(err) {
        console.log(err);
      }
      req.session.tokens = tokens;
      setSessionData(req, oauth2Client, tokens, function() {
        var path = req.session.custom_target;
        delete req.session.custom_target;
        res.redirect(path || '/');
      });
    });
  }
  else {
    res.redirect('/');
  }
});

/* GET login page. */
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if(err) res.send(err);
    else res.redirect('/');
  })
});

router.get('/*', function(req, res, next) {
  //if (req.session.tokens || req.host === 'localhost') {
  if (req.session.tokens) {
    next();
  }
  else {
    req.session.custom_target = req.path;
    res.render('login');
  }
});



function setSessionData(req, oauth2Client, tokens, cb) {
  oauth2Client.setCredentials(tokens);
  gapi.oauth2("v2").userinfo.get({auth:oauth2Client}, function(err, results){
      req.session.user = results;
      cb();
  });
};



/*
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      if(appAuthenticate(req))
        if(req.session.custom_target)
          res.redirect(req.session.custom_target);
        else
          res.redirect('/list');
      else {
        logout(req, true);
        res.redirect('/unauthorized');
      }
    });

router.get('/*', ensureAuthenticated);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.custom_target = req.url;
  res.redirect('/login');
}
*/

module.exports = router;
