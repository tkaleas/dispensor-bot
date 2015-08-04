#!/bin/bash
APP_NAME=${YOUR APP NAME HERE}
SLACK_TOKEN=${YOUR SLACK TOKEN HERE}

#Venmo and Passcodes
DISPENSOR_PASSKEY=${YOUR SPECIAL KEY}
VENMO_CLIENT_ID=${YOUR VENMO CLIENT ID}
VENMO_CLIENT_SECRET=${YOUR VENMO CLIENT SECRET}

HEROKU_URL="http://$APP_NAME.herokuapp.com"

#Update and login to Heroku
heroku auth:login

#APP CREATION - only if app doesnt exist already
if [ -z `heroku list | grep $APP_NAME` ]
  then
    heroku create $APP_NAME
    heroku addons:add rediscloud

#Configure Environment
heroku config:set HUBOT_SLACK_TOKEN=$SLACK_TOKEN
heroku config:set HEROKU_URL=$HEROKU_URL
heroku config:set DISPENSOR_PASSKEY=$DISPENSOR_PASSKEY
heroku config:set VENMO_CLIENT_ID=$VENMO_CLIENT_ID
heroku config:set VENMO_CLIENT_SECRET=$VENMO_CLIENT_SECRET

#Make Sure We've Updated Heroku to Latest Master
git push heroku master
