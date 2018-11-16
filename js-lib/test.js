const ywot = require('./ywot.js');
const fs = require('fs');

var client = new ywot.YWOT()
var main = client.openworld();

alert = new ywot.Space()
alert.readfile('./alert.txt');
console.log(alert.data);
x = alert.gettile(2,0).data
