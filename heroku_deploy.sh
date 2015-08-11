#!/bin/bash
APP_NAME="dispensor"
SLACK_TOKEN="YOUR SLACK TOKEN"

#Venmo and Passcodes
DISPENSOR_PASSKEY="your_password"
VENMO_CLIENT_ID="5555"
VENMO_CLIENT_SECRET="YOUR CLIENT SECRET"
VENMO_CALLBACK_URL="https://$APP_NAME.herokuapp.com"

HEROKU_URL="https://$APP_NAME.herokuapp.com"

#first update from develop
git push
git checkout master
git pull origin master
git merge $1
git push origin master

#Update and login to Heroku
if [ `heroku auth` == "not logged in" ]; then
  heroku auth:login
fi

#APP CREATION - only if app doesnt exist already
if [ -z `heroku list | grep $APP_NAME` ]; then
    heroku create $APP_NAME
    heroku addons:add rediscloud
fi

#Configure Environment
heroku config:set HUBOT_SLACK_TOKEN=$SLACK_TOKEN
heroku config:set HEROKU_URL=$HEROKU_URL
heroku config:set DISPENSOR_PASSKEY=$DISPENSOR_PASSKEY
heroku config:set VENMO_CLIENT_ID=$VENMO_CLIENT_ID
heroku config:set VENMO_CLIENT_SECRET=$VENMO_CLIENT_SECRET
heroku config:set VENMO_CALLBACK_URL=$VENMO_CALLBACK_URL

#Make Sure We've Updated Heroku to Latest Master
git push heroku master
git checkout $1
