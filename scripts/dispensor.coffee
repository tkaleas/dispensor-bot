# Description
#   A helpful vending machine bot to serve you whatever snacks you want
#
# Dependencies:
#   "snackmanager": "0.0.1"
#
# Configuration:
#   LIST_OF_ENV_VARS_TO_SET
#
# Commands:
#   hubot add <quantity> ($)<cost> (each) <snack name> to the snacklist
#   hubot remove <snack name> from (snack|grocery)list
#   hubot clear (snack|grocery|consumer)list
#   hubot register me as <venmo email address>
#   hubot dispense <quantity (1 if no quantity specified)> <snack name>
#   hubot print (grocery|consumer|snack)list
# Notes:
#   <optional notes required for the script>
#
# Author:
#   tkaleas
#
SnackManager = require "./snackmanager"
Venmo = require "venmo"
VenmoCharger = require "./venmocharger"
sprintf = require("sprintf-js").sprintf

currency = (amount) ->
  sprintf("$%.2f",amount)


module.exports = (robot) ->
  retrieveSnackManager = () ->
    snackmanager = new SnackManager()
    snackmanager.loadRawData(JSON.parse(robot.brain.get('snacks')))
    return snackmanager

  saveSnackManager = (snackManager) ->
    robot.brain.set('snacks', JSON.stringify(snackManager.getSnackData()))
    robot.brain.save();
    return snackManager

  sm = retrieveSnackManager()
  saveSnackManager(sm)

  #Venmo
  #venmo_error = new Error("Must supply a private Venmo API Key as environment variable VENMO_API_KEY. Correct Usage: \'export VENMO_API_KEY=YOUR_KEY mocha test/*.js\'")
  # throw venmo_error if !(process.env.VENMO_API_KEY?)
  venmo = new Venmo(process.env.VENMO_API_KEY);

  #Add Snacks
  robot.respond  /add +?(\d+(\.\d{1,2})*) +?\$?(\d+(\.\d{1,2})*) +?(each)? *?(\w*) +?to +?the +?snacklist *$/i, (res) ->
    quantity = parseInt(res.match[1])
    cost = parseFloat(res.match[3])
    each = res.match[5]
    snackName = res.match[6]
    snackmanager = retrieveSnackManager();
    if(each)
      snackmanager.addSnacks(snackName, quantity, null, cost);
    else
      snackmanager.addSnacks(snackName, quantity, cost);
    saveSnackManager(snackmanager)
    res.send "Dispensor added #{quantity} of #{snackName} to the snacklist."
    res.send "The snack will cost #{cost}."

  #Add Consumer
  robot.respond  /register me as ((([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?))|((\()?\d{3}(\))?(-|\s)?\d{3}(-|\s)\d{4})) *$/i, (res) ->
    userName = res.message.user.name
    email = res.match[2]
    phone = res.match[6]
    snackmanager = retrieveSnackManager();
    snackmanager.addConsumer(userName, email, phone);
    saveSnackManager(snackmanager)
    res.send "Dispensor has added \'#{userName}\' to the consumer list."

  #Clear Snack or Grocery List
  robot.respond  /clear +?(snack|grocery|consumer)list *$/i, (res) ->
    listType = res.match[1]
    snackmanager = retrieveSnackManager()
    switch listType
      when "snack" then snackmanager.snackList = []
      when "grocery" then snackmanager.groceryList = []
      when "consumer" then snackmanager.groceryList = []
      else return
    saveSnackManager(snackmanager)
    res.send "Cleared the #{listType}list."

  #Remove Snack
  robot.respond /remove +?(\w*) +?from +?(snack|grocery)list *$/i, (res) ->
    listType = res.match[2]
    snackName = res.match[1]
    snackmanager = retrieveSnackManager()
    snackmanager.removeSnack(snackName,listType,-1)
    saveSnackManager(snackmanager)
    res.send "Removed #{snackName} from the ${listType}list"

  #Eat Snack
  robot.respond /dispense +?(\d+)? *?(\w+) *$/i, (res) ->
    quantity = if res.match[1]? then res.match[1] else 1
    snackName = res.match[2]
    snackmanager = retrieveSnackManager()
    snackmanager.eatSnacks snackName, quantity, (err, price) ->
      if err
        res.send err
      else
        userName = res.message.user.name
        venmoQuery = snackmanager.getVenmoUser userName
        if not venmoQuery?
          res.send "No Venmo User Found For: " + userName
          return
        #update accesstoken if needed
        VenmoCharger.getVenmoChargeAccount (user) ->
          venmo.updateToken user.AccessToken
          console.log("Venmo Charge User Is: " + JSON.stringify(user))
          venmo.chargeUser venmoQuery, "Charge for Snack: #{snackName}", price, (error, resp) ->
            if error
              #Respond With Venmo Charge Error
              res.send "Unable to Charge \`#{userName}\` via Venmo."
            else
              saveSnackManager(snackmanager)
              console.log(error)
              console.log(resp)
              res.send "Eating #{snackName}. Venmo charge has been sent to #{userName}."

  # T Snacklist
  robot.respond  /print +?(snack|grocery|consumer)list *$/i, (res) ->
    listType = res.match[1]
    snackmanager = retrieveSnackManager()
    listString = ""
    switch listType
      when "snack" then list = snackmanager.snackList
      when "grocery" then list =  snackmanager.groceryList
      when "consumer" then list =  snackmanager.consumerList
      else return
    for item in list
      if listType == "consumer"
        listString += "Name: #{item.name}  Email:#{item.email}  Phone: #{item.phone}\n";
      else
        listString += "Name: #{item.name} Cost: #{currency(item.cost)}  Quantity: #{item.quantity}\n";
    res.send "Here is the current #{listType}list :\n#{listString}"
    saveSnackManager(snackmanager)
