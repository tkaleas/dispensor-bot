/**
* Module dependencies.
*/

var fs = require('fs');
var _ = require('underscore')
/**
* Module exports.
*/

//var snackExample = { name: "Trail Mix", cost: 5.88, quantity:24 };
//Name: Slack User, email/venmoID -> used to make payment charges
//var consumerExample = { name: "tkaleas", email: "terry.kaleas@gmail.com", venmoID: 84736364};

function getNames(list){
  return list.map(function(obj){
    return obj.name;
  });
}

module.exports = SnackManager;

function SnackManager () {
  this.snackList = [];
  this.groceryList = [];
  this.consumerList = [];
}

SnackManager.prototype.addConsumer = function(name, email, phone, venmoID){
  var index = getNames(this.consumerList).indexOf(name);
  if(index >=0){
    console.log("User Already Added To Consumer List. Updating ID's If Not Null");
    if(email)
      this.consumerList[index].email = email;
    if(venmoID)
      this.consumerList[index].venmoID = venmoID;
    if(phone)
      this.consumerList[index].phone = phone;
  } else {
    this.consumerList.push({name:name, email: email, venmoID: venmoID, phone: phone});
  }
}

//Modifying Snacks
SnackManager.prototype.addSnacks = function(snackName, quantity, totalCost, costPerSnack) {
  var price;
  //Switch between totalcost or cost per snack being spefified, cost per snack takes precedence
  if(arguments.length > 3){
    price = costPerSnack;
  } else {
    price = totalCost/quantity;
  }
  //Snack Object
  var index = getNames(this.snackList).indexOf(snackName);
  if(index >= 0){
    var oldSnack = this.snackList[index];
    this.snackList[index] = { name: snackName, cost: price, quantity: oldSnack.quantity+quantity};
    return this.snackList[index];
  } else {
    var newSnack = { name: snackName, cost: price, quantity: quantity}
    this.snackList.push(newSnack);
    return newSnack;
  }
}

SnackManager.prototype.eatSnacks = function(snackName, quantity, callback) {
  var index = getNames(this.snackList).indexOf(snackName);
  if(index >= 0){
    var oldSnack = this.snackList[index];
    var oldSnackQuant = oldSnack.quantity;
    this.snackList[index].quantity = oldSnack.quantity-quantity;
    //Remove Snacks From List If We Are Out
    if(this.snackList[index].quantity <= 0){
      this.groceryList.push(_.extend(oldSnack, {quantity:0}));
      this.snackList.splice(index,1);
      console.log("Out of Snack: " + snackName + "\nAdding to Grocery List");
      callback(null, oldSnackQuant*oldSnack.cost);
    } else {
      //Callback With Amount To Charge
      callback(null, quantity*oldSnack.cost);
    }
  } else {
    callback("No snacks of the snack type were found.");
  }
}

SnackManager.prototype.removeSnack = function(snackName, listType, quantity) {
  if(listType == "grocery"){
    var i = getNames(this.groceryList).indexOf(snackName);
    if(i >= 0){
      this.groceryList.splice(i,1);
    } else {
      console.log("Snack not in grocery list.");
    }
    return;
  }
  var index = getNames(this.snackList).indexOf(snackName);
  if(index >= 0){
    var oldSnack = this.snackList[index];
    this.snackList[this.snackList.indexOf(snackName)] = { name: snackName, cost: price, quantity: oldSnack.quantity-quantity};
    //Remove Snacks From List If We Are Out
    if(this.snackList[index].quantity <= 0 || quantity < 0){
      console.log("Removed \'"+snackName+"\' from snacklist.");
    } else {
      console.log("Removed "+quantity.toString()+"of\'"+snackName+"\' from snacklist.");
    }
  } else {
    console.log("No Snacks Found. Nothing to Remove.");
  }
}

SnackManager.prototype.getSnackData = function(){
  return { snackList: this.snackList, groceryList: this.groceryList, consumerList: this.consumerList};
}

SnackManager.prototype.getVenmoUser = function(name){
  var index = getNames(this.consumerList).indexOf(name);
  if(index >=0){
    return {user_id: this.consumerList[index].venmoID, email: this.consumerList[index].email, phone: this.consumerList[index].phone};
  } else {
    console.log("Venmo User for \'"+name+"\' Not Found");
  }
}

//Load snackLists
SnackManager.prototype.loadRawData = function(brainData){
  if(brainData){
    this.snackList = brainData.snackList;
    this.groceryList = brainData.groceryList;
    this.consumerList = brainData.consumerList;
  }
}

//Load this.snackLists
SnackManager.prototype.loadData = function(pathToData){
  var self = this;
  fs.readFile(pathToData, function (err, data) {
    if (err) throw err;
    rawData = JSON.parse(data.toString());
    self.loadRawData(rawData);
  });
}

SnackManager.prototype.saveData = function(pathToData){
  var snackString = JSON.stringify(this.getSnackData());
  fs.writeFile(pathToData, snackString, function (err, data) {
    if (err) throw err;
    console.log("Saved Snack Data to :\""+pathToData+"\"");
  });
}

SnackManager.prototype.clearGroceryList = function(){
  this.groceryList = [];
}

SnackManager.prototype.toString = function(){
  return "{SnackList: "+this.snackList.toString()+"}\n{ConsumerList: "+consumerList.toString()+"}";
}
