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
var url = require('url');

var VenmoStrategy = require('passport-venmo').Strategy;

//TODO: Switch To Using Environment Variables So Real Values Don't Show Up in Github
module.exports = VenmoCharger;

function VenmoCharger(robot) {
  var DISPENSOR_PASSKEY = process.env.DISPENSOR_PASSKEY;
  var Venmo_CLIENT_ID = process.env.VENMO_CLIENT_ID;
  var Venmo_CLIENT_SECRET = process.env.VENMO_CLIENT_SECRET;
  var me = this;  //for scoped referenced back this this in nested functions

  //Redis Client
  if(process.env.REDISTOGO_URL){
    info   = url.parse(process.env.REDISTOGO_URL, true);
    this.rclient = redis.createClient(info.port, info.hostname, {no_ready_check: true});
  }
  else {
    this.rclient = redis.createClient();
  }

  this.rclient.on('connect', function() {
      console.log('Venmo Charger Redis Connected...');
  });

  var redisSessionStore = this.rclient.redisSessionStore;
  var sess = {
    store: redisSessionStore,
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: false,
    cookie: {
      expires: false,
    }
  };

  //Hijack the robots express server and use it as our own
  //roubot.router.set('port', process.env.PORT || 5000);
  robot.router.set('view engine', 'html');
  robot.router.use(session(sess));
  robot.router.use(passport.initialize());
  robot.router.use(passport.session());
  robot.router.use(bodyParser.json());
  robot.router.use(bodyParser.urlencoded({extended:true}));

  //Serve Static Web For Web App
  robot.router.use('/', express.static(path.resolve(__dirname,'../public')));

  //console.log(path.resolve(__dirname,'../public'))
  var baseCallbackUrl = process.env.URL | "http://localhost:8080";
  console.log("BASE CALLBACK:" + baseCallbackUrl);
  var venmoStrategy = new VenmoStrategy({
      clientID: Venmo_CLIENT_ID,
      clientSecret: Venmo_CLIENT_SECRET,
      callbackURL: baseCallbackUrl + "/auth/venmo/callback"
    },

    function(accessToken, refreshToken, profile, done) {
      console.log("Profile ID :" + profile.id);
      console.log("Access Token: " + accessToken);
      console.log("Refresh Token: " + refreshToken);
      var user = { VenmoId: profile.id, AccessToken:accessToken, RefreshToken:refreshToken};
      me.rclient.set('venmoCharger', JSON.stringify(user), function (err, reply) {
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
      this.rclient.get('venmoCharger', function(err, user) {
          if (err) throw err;
          console.log('passport deserializing...'+JSON.parse(user).VenmoId);
          done(err, JSON.parse(user));
      });
  });

  //Constants
  var oathURI = "https://api.venmo.com/v1/oauth/authorize";
  var redirectURI = "http://localhost:8080/redirectTo";
  var accessTokenURI = "https://api.venmo.com/v1/oauth/access_token";


  this.passKeyCheck =  function (passkey){
              if(passkey === DISPENSOR_PASSKEY)
                return true;
              else
                return false;
            }

  this.checkPassKey = function (req,res,next) {
              var passKey = req.body.pwd;
              if(this.passKeyCheck(passKey)){
                next();
              } else {
                console.log("Incorrect Passkey Was Input");
                res.redirect('/');
              }
            }

  //TODO: Come Up With Some Better User Flow Here For Updating the Charge Account
  robot.router.post(  '/auth/venmo',
            this.checkPassKey,
            passport.authenticate('venmo', {
              scope: ['make_payments', 'access_feed', 'access_profile', 'access_email', 'access_phone', 'access_balance', 'access_friends'],
              failureRedirect: '/'
            }), function(req, res) {
                  res.redirect('/');
                }
          );

  robot.router.get(  '/users/venmo',
            function(req, res) {
              me.getVenmoChargeAccount( function(user) {
                          if(user) {
                            var venmo = new Venmo(user.AccessToken);
                            venmo.getCurrentUser(function(err,data){
                              var condensed = { username: data.user.username,
                                                displayname: data.user.display_name,
                                                email: data.user.email
                                              };
                              res.json(condensed);
                            });
                          }
                          else{
                            console.log("No Venmo User Found.")
                          }
                      });
            });

  robot.router.get( '/auth/venmo/callback',
            passport.authenticate('venmo', {
              failureRedirect: '/'
            }), function(req, res) {
              //Nothing If we got Here (Maybe Render The Client Information if Its Been Inputed Properly?)
              //res.json({user: req.user ? JSON.stringify(req.user) : 'null'});
              res.redirect('/');
            }
          );

  robot.router.get( '/auth/venmo/refresh',
            passport.authenticate('venmo', {
              failureRedirect: '/'
            }), function(req, res) {
              res.json({user: req.user ? JSON.stringify(req.user) : 'null'});
            }
          );
}
// VenmoCharger.prototype.checkPassKey = function (req,res,next) {
//   var passKey = req.body.pwd;
//   if(this.passKeyCheck(passKey)){
//     next();
//   } else {
//     console.log("Incorrect Passkey Was Input");
//     res.redirect('/');
//   }
// }

VenmoCharger.prototype.ensureRefreshedToken = function (req, res, next) {
   //Get Old Access Token
   this.rclient.get('venmoCharger', function(err, user) {
        if (err) throw err;
        user = JSON.parse(user);
        var oldRefreshToken = user.RefreshToken;
        refresh.requestNewAccessToken('venmo', oldRefreshToken, function(err, accessToken, refreshToken) {
          //Store New Access Token
          if(refreshToken){
            var newUser = _.extend(user,{AccessToken:accessToken, RefreshToken:refreshToken});
              this.rclient.set('venmoCharger', JSON.stringify(newUser), function (err, reply) {
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

// //Launch the express server
// var server = app.listen(app.get('port'), function() {
//   console.log('Dispensor Venmo server listening on port ' + server.address().port);
// });

VenmoCharger.prototype.getVenmoChargeAccount = function(callback) {
  this.rclient.get('venmoCharger', function(err, user) {
    if (err) throw err;
    //console.log(JSON.parse(user));
    callback(JSON.parse(user));
  });
};

// //Module Exports -> Export Current Venmo Charge User
// module.exports = {
//   getVenmoChargeAccount: getVenmoChargeAccount
// };
