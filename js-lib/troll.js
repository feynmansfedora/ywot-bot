const ywot = require('./ywot.js');

var client = new ywot.YWOT()
var main = client.openworld()

var thissource;
var sourcenotcalled = true;
var emptytile = [];
for (var x=0; x<16; x++){
  for (var y=0; y<8; y++){
    emptytile.push([y,x,' '])
  }
}

main.on('channel', (source)=>{
  if (sourcenotcalled){
    sourcecalled = false;
    thissource = source;
  }
});

main.on('tileUpdate', (sender, source, tiles)=>{
  if (sender != thissource){
    a = [].concat.apply([],Object.keys(tiles).map((tile)=>{
      return JSON.parse(JSON.stringify(emptytile)).map((char) => {
        char.unshift(parseInt(tile.split(',')[1]));
        char.unshift(parseInt(tile.split(',')[0]));
        return char;}
      );}))
    main.write(a);
  }
});
