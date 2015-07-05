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
#   hubot register me as (venmo|email) <venmo ID or email address>
#   hubot eat <quantity> <snack name>
#   hubot print (grocery|consumer|snack)list
# Notes:
#   <optional notes required for the script>
#
# Author:
#   tkaleas

#Clear Snacklist
SnackManager = require("./snackmanager")
Venmo = require("venmo")


module.exports = (robot) ->
  retrieveSnackManager = () ->
    snackmanager = new SnackManager()
    snackmanager.loadRawData(JSON.parse(robot.brain.get('snacks')))
    return snackmanager

  saveSnackManager = (snackManager) ->
    robot.brain.set('snacks', JSON.stringify(snackManager.getSnackData()))
    return snackManager

  sm = retrieveSnackManager()
  saveSnackManager(sm)

  #Venmo
  venmo_error = new Error("Must supply a private Venmo API Key as environment variable VENMO_API_KEY. Correct Usage: \'export VENMO_API_KEY=YOUR_KEY mocha test/*.js\'")
  throw venmo_error if !(process.env.VENMO_API_KEY?)
  venmo = new Venmo(process.env.VENMO_API_KEY)

  #Add Snacks
  robot.respond  /add +?(\d+(\.\d{1,2})*) +?\$?(\d+(\.\d{1,2})*) +?(each)? *?(\w*) +?to +?the +?snacklist *$/i, (res) ->
    quantity = res.match[1]
    cost = res.match[3]
    each = res.match[5]
    snackName = res.match[6]
    snackmanager = retrieveSnackManager();
    if(each)
      snackmanager.addSnacks(snackName, quantity, null, cost);
    else
      snackmanager.addSnacks(snackName, quantity, cost, null);
    saveSnackManager(snackmanager)
    res.send "Dispensor added #{quantity} of #{snackName} to the snacklist."

  #Add Consumer
  robot.respond  /register me as (venmo|email) +?(\S+)*$/i, (res) ->
    type = res.match[1]
    userName = res.message.user.name
    email = venmoID = ""
    snackmanager = retrieveSnackManager();
    switch type
      when "venmo" then venmoID = res.match[2]
      when "email" then email = res.match[2]
      else return
    snackmanager.addConsumer(userName,email,venmoID)
    saveSnackManager(snackmanager)
    res.send "Dispensor has added \'#{userName}\' to the consumer list."

  #Clear Snack or Grocery List
  robot.respond  /clear +?(snack|grocery|consumer)list *$/i, (res) ->
    listType = res.match[1]
    snackmanager = retrieveSnackManager();
    switch listType
      when "snack" then snackmanager.snackList = []
      when "grocery" then snackmanager.groceryList = []
      when "consumer" then snackmanager.groceryList = []
      else return
    saveSnackManager(snackmanager)
    res.send "Cleared the ${listType}list."

  #Remove Snack
  robot.respond /remove +?(\w*) +?from +?(snack|grocery)list *$/i, (res) ->
    listType = res.match[2]
    snackName = res.match[1]
    snackmanager = retrieveSnackManager();
    snackmanager.removeSnack(snackName,listType,-1)
    saveSnackManager(snackmanager)
    res.send "Removed #{snackName} from the ${listType}list"

  #Eat Snack
  robot.respond /dispense +?(\d)? *?(of)? *?(\w*) *$/i, (res) ->
    quantity = if res.match[1]? then res.match[1] else 1
    snackName = res.match[3]
    snackmanager = retrieveSnackManager();
    snackmanager.eatSnacks(snackName,quantity,-1)
    res.send "Eating #{snackName}. Venmo charge has been sent to username."
    saveSnackManager(snackmanager)

  #Print Snacklist
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
        listString += "Name: #{item.name}  Email:#{item.email}  Venmo: #{item.venmoID}\n";
      else
        listString += "Name: #{snack.name} Cost: #{snack.cost}  Quantity: #{snack.quantity}\n";
    res.send "Here is the current #{listType}list :\n#{listString}"
    saveSnackManager(snackmanager)
