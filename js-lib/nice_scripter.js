//Starts by clearing out the tiles immediately around centre (changes to a notification about the Ω character).
//Protects those tiles with the tileUpdate'r
//Responds to Ω with an empty box.
ywot = require('./ywot.js');

var client = new ywot.YWOT();
var main = client.openworld('');
var alert = new ywot.Space();
alert.readfile('./alert.txt');
var cmdbox = new ywot.Space()
cmdbox.readfile('./cmdbox.txt');
main.on('on',()=>{
  main.write(alert.towrite(-2,-2));
});
var thissender;
main.on('channel',(sender)=>{thissender = sender;});
main.on('tileUpdate',(sender,source,tiles)=>{
  if (sender == thissender){
    return 0;
  }
  let valid = Object.keys(tiles).map((tile)=>{return tile.split(',').map((num)=>{return parseInt(num);});}).filter((tile)=>{return (tile[0] >= -2 && tile[0] <= 1 && tile[1] >= -2 && tile[1] <= 1);});
  for (i=0; i<valid.length; i++){
    curtile = new ywot.Space();
    curtile.fromtile(tiles[valid[i]].content);
    tilespace = alert.gettile(valid[i][0]+2,valid[i][1]+2).sub(curtile);
    main.write(tilespace.towrite(valid[i][0],valid[i][1]));
  };
  if (!(valid == [])){
    let omegapos = Object.keys(tiles).filter((tile)=>{return tiles[tile].content.includes('Ω');}).map((coord)=>{return coord.split(',').map((num)=>{return parseInt(num);});});
    for (i=0; i<omegapos.length; i++){
      main.write(cmdbox.towrite(omegapos[i][0],omegapos[i][1]));
    }
  }
});
