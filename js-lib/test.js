const ywot = require('./ywot.js');
const fs = require('fs');

var client = new ywot.YWOT()
var main = client.openworld();

alert = new ywot.Space()
alert.readfile('./alert.txt');
box = new ywot.Space();
box.readfile('./cmdbox.txt');
console.log(alert.add(box,0,0,-2,-1).data);
