const ywot = require('./ywot.js');
const fs = require('fs');

var client = new ywot.YWOT()
var main = client.openworld();

function print(in0){
  console.log(in0.length);
  fs.writeFile('./full-world.txt', in0.map((row)=>{return row.join()}).join('\n'), (err) => {if(err){return console.log(err);}});
}
main.on('on', () => {
  main.write([[-2,0,6,7,'t']]);
  console.log('first write!');
  region = [];
  for(var i=0; i<999; i++){
    region.push([-499,i-499,499,i-499]);
  }
  main.fetch(region,print);
})
client.on('free', () => {})
