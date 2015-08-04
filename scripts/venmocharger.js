//Test HTTP Server
var http = require('http');
var dispatch = require('dispatch');
var request = require('superagent');
var passport = require('passport');
var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var app = express();
var redis = require('redis');
var session = require('express-session');
var refresh = require('passport-oauth2-refresh');
var bodyParser = require('body-parser');
var Venmo = require('venmo');

var VenmoStrategy = require('passport-venmo').Strategy;

//TODO: Switch To Using Environment Variables So Real Values Don't Show Up in Github
var DISPENSOR_PASSKEY = process.env.DISPENSOR_PASSKEY;
var Venmo_CLIENT_ID = process.env.VENMO_CLIENT_ID;
var Venmo_CLIENT_SECRET = process.env.VENMO_CLIENT_SECRET;

//Redis Client
var rclient = redis.createClient();
rclient.on('connect', function() {
    console.log('Redis Connected...');
});

var redisSessionStore = rclient.redisSessionStore;
var sess = {
  store: redisSessionStore,
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: false,
  cookie: {
    expires: false,
  }
};

app.set('port', process.env.PORT || 8080);
app.set('view engine', 'html');
app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//Serve Static Web For Web App
app.use('/', express.static(path.resolve(__dirname,'../public')));

//console.log(path.resolve(__dirname,'../public'))
var venmoStrategy = new VenmoStrategy({
    clientID: Venmo_CLIENT_ID,
    clientSecret: Venmo_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/venmo/callback"
  },

  function(accessToken, refreshToken, profile, done) {
    console.log("Profile ID :" + profile.id);
    console.log("Access Token: " + accessToken);
    console.log("Refresh Token: " + refreshToken);
    var user = { VenmoId: profile.id, AccessToken:accessToken, RefreshToken:refreshToken};
    rclient.set('venmoCharger', JSON.stringify(user), function (err, reply) {
      if (err) throw err;
      console.log('Venmo Charge Account Saved! User is: ');
      //console.log(user);
      done(err, user);
    });
  }
);

passport.use(venmoStrategy);
refresh.use(venmoStrategy);

passport.serializeUser(function(user, done) {
    console.log('passport serializing...' + user.VenmoId);
    done(null, user.VenmoId);
});

passport.deserializeUser(function(id, done) {
    rclient.get('venmoCharger', function(err, user) {
        if (err) throw err;
        console.log('passport deserializing...'+JSON.parse(user).VenmoId);
        done(err, JSON.parse(user));
    });
});

//Constants
var oathURI = "https://api.venmo.com/v1/oauth/authorize";
var redirectURI = "http://localhost:8080/redirectTo";
var accessTokenURI = "https://api.venmo.com/v1/oauth/access_token";

//TODO: Come Up With Some Better User Flow Here For Updating the Charge Account
app.post(  '/auth/venmo',
          checkPassKey,
          passport.authenticate('venmo', {
            scope: ['make_payments', 'access_feed', 'access_profile', 'access_email', 'access_phone', 'access_balance', 'access_friends'],
            failureRedirect: '/'
          }), function(req, res) {
                res.redirect('/');
              }
        );

app.get(  '/users/venmo',
          function(req, res) {
            getVenmoChargeAccount( function(user) {
                        var venmo = new Venmo(user.AccessToken);
                        venmo.getCurrentUser(function(err,data){
                          var condensed = { username: data.user.username,
                                            displayname: data.user.display_name,
                                            email: data.user.email
                                          };
                          res.json(condensed);
                        });
                    });
          });

app.get( '/auth/venmo/callback',
          passport.authenticate('venmo', {
            failureRedirect: '/'
          }), function(req, res) {
            //Nothing If we got Here (Maybe Render The Client Information if Its Been Inputed Properly?)
            //res.json({user: req.user ? JSON.stringify(req.user) : 'null'});
            res.redirect('/');
          }
        );

app.get( '/auth/venmo/refresh',
          passport.authenticate('venmo', {
            failureRedirect: '/'
          }), function(req, res) {
            res.json({user: req.user ? JSON.stringify(req.user) : 'null'});
          }
        );

function checkPassKey(req,res,next) {
  var passKey = req.body.pwd;
  if(passKeyCheck(passKey)){
    next();
  } else {
    console.log("Incorrect Passkey Was Input");
    res.redirect('/');
  }
}

function passKeyCheck(passkey){
  if(passkey === DISPENSOR_PASSKEY)
    return true;
  else
    return false;
}

function ensureRefreshedToken(req, res, next) {
   //Get Old Access Token
   rclient.get('venmoCharger', function(err, user) {
        if (err) throw err;
        user = JSON.parse(user);
        var oldRefreshToken = user.RefreshToken;
        refresh.requestNewAccessToken('venmo', oldRefreshToken, function(err, accessToken, refreshToken) {
          //Store New Access Token
          if(refreshToken){
            var newUser = _.extend(user,{AccessToken:accessToken, RefreshToken:refreshToken});
              rclient.set('venmoCharger', JSON.stringify(newUser), function (err, reply) {
              if (err) throw err;
              console.log('Venmo Charge Account Refreshed! User is: ');
              console.log(user);
              next();
            });
          } else {
            console.log("Refresh Token was not aquired, Venmo Charge User has not changed.");
            next();
          }
          });
    });
}

//Launch the express server
var server = app.listen(app.get('port'), function() {
  console.log('Dispensor Venmo server listening on port ' + server.address().port);
});

getVenmoChargeAccount = function(callback) {
  rclient.get('venmoCharger', function(err, user) {
    if (err) throw err;
    //console.log(JSON.parse(user));
    callback(JSON.parse(user));
  });
};

//Module Exports -> Export Current Venmo Charge User
module.exports = {
  getVenmoChargeAccount: getVenmoChargeAccount
};
