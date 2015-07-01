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
#   hubot add <quantity> of <snack name> to the snacklist
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

  #Add Snacks
  robot.respond  /add +?(\d+(\.\d{1,2})*) +?of +?(\w*) +?to +?the +?snacklist *$/i, (res) ->
    quantity = res.match[1]
    snackName = res.match[2]
    snackmanager = retrieveSnackManager();
    saveSnackManager(snackmanager)

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
    res.send "Cleared the ${listType}list"

  #Remove Snack
  robot.respond /remove +?(\w*) +?from +?(snack|grocery)list *$/i, (res) ->
    listType = res.match[2]
    snackName = res.match[1]
    snackmanager = retrieveSnackManager();
    snackmanager.removeSnack(snackName,listType,-1)
    saveSnackManager(snackmanager)
    res.send "Removed #{snackName} from the ${listType}list"

  #Eat Snack
  robot.respond /eat +?(\d) +?(\w*) *$/i, (res) ->
    snackName = res.match[1]
    listType = res.match[2]
    snackmanager = retrieveSnackManager();
    snackmanager.removeSnack(snackName,listType,-1)
    saveSnackManager(snackmanager)
    res.send "Eating #{listType} from the ${listType}list"

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
