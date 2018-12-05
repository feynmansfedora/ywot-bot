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

var curcmds = []; //Current blocks to run commands in
var old = {}; //Old data which back be replaced by the command "back"
var cmdkeys = {"back":(tiley,tilex,tile)=>{
  let tilereplace = new ywot.Space();
  let curtile = new ywot.Space();
  curtile.fromtile(tile);
  tilereplace.fromtile(old[[tiley,tilex]].replace('Ω',' '));
  main.write(tilereplace.sub(curtile).towrite(tiley,tilex));
},"bsck":(tiley,tilex,tile)=>{
  let tilereplace = new ywot.Space();
  let curtile = new ywot.Space();
  curtile.fromtile(tile);
  tilereplace.fromtile(old[[tiley,tilex]]);
  main.write(tilereplace.sub(curtile).towrite(tiley,tilex));
},"list":(tiley,tilex,tile)=>{
  //Make sure valid area is protected; create a stable framework to allow callbacks like this
}};
main.on('tileUpdate',(sender,source,tiles, tilekeys)=>{
  console.log('tileUpdate');
  if (sender == thissender){ //Prevents infinite recursion on its own edits
    return 0;
  }
  let valid = tilekeys.filter(tile => (tile[0] >= -2 && tile[0] <= 1 && tile[1] >= -2 && tile[1] <= 1));
  for (i=0; i<valid.length; i++){
    curtile = new ywot.Space();
    curtile.fromtile(tiles[valid[i]].content);
    tilespace = alert.gettile(valid[i][0]+2,valid[i][1]+2).sub(curtile);
    main.write(tilespace.towrite(valid[i][0],valid[i][1]));
  };
  let omegapos = tilekeys.filter(tile => tiles[tile].content.includes('Ω'));
  if (valid.length == 0){
    for (i=0; i<omegapos.length; i++){
      curtile = new ywot.Space();
      curtile.fromtile(tiles[omegapos[i]].content);
      old[omegapos[i]] = tiles[omegapos[i]].content;
      curcmds.push(omegapos[i]);
      //console.log(cmdbox);
      //console.log(curtile);
      //console.log(cmdbox.sub(curtile));
      main.write(cmdbox.sub(curtile).towrite(parseInt(omegapos[i][0]),parseInt(omegapos[i][1])));
    }
  }
  if (omegapos.length == 0){
    console.log('here');
    //!!!
    //!!!
    //Big error here: for some reason, array objects with the same internals aren't treated as equivalent
    docmds = tilekeys.filter(tile => curcmds.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile))); //List of edited tiles which have been recently omega'd
    for (i=0; i<docmds.length; i++){
      cmd = docmds[i]; //A given edited tile which has been omega'd
      console.log(cmd);
      for (j=0; j<Object.keys(cmdkeys).length; j++){ //Iterates through callback functions and each command caller name
        if (tiles[cmd].content.includes(Object.keys(cmdkeys)[j])){ //If the given edited tile has the cmd caller name
          Object.values(cmdkeys)[j](cmd[0],cmd[1],tiles[cmd].content); //Calls callback; gives coordinates
        }
      }
    }
  }
});
