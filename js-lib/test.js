const ywot = require('./ywot.js');

var client = new ywot.YWOT()
var main = client.openworld();

function print(in0){
  console.log(in0.length);
}
main.on('on', () => {
  main.write([[-2,0,6,7,'t']]);
  console.log('first write!');
  region = [];
  for(var i=0; i<1000; i++){
    region.push([0,i,999,i]);
  }
  main.fetch(region,print);
})
client.on('free', () => {})
