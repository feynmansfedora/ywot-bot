const ywot = require('../main/ywot.js');
const fs = require('fs');

var client = new ywot.YWOT()
var main = client.openworld();

alert = new ywot.Space()
alert.readfile(__dirname + '/alert.txt');
console.log(alert.gettile(2,0).data);
