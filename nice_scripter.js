//Starts by clearing out the tiles immediately around centre (changes to a notification about the Ω character).
//Protects those tiles with the tileUpdate'r
//Responds to Ω with an empty box.
const ywot = require('./ywot.js');

var client = new ywot.YWOT();
var main = client.openworld('');
var passkey = client.openworld('a7jrxn99')
var alert = new ywot.Space();
alert.readfile('./alert.txt');
var cmdbox = new ywot.Space()
cmdbox.readfile('./cmdbox.txt');
main.on('on',()=>{
  main.write(alert.towrite(-2,-2));
});
var thissender;
main.on('channel',(sender)=>{thissender = sender;});

//"User-defined" tools
function gettime(tiley, tilex, tile){
  console.log('gettime called');
  let today = new Date();
  let date = ('  ' + today.toISOString().substring(0,10)).padEnd(16, ' ').split('');
  let time = ('  ' + today.toISOString().slice(11,19) + 'Z').padEnd(16, ' ').split('');
  let space = Array(16).fill(' ');
  let newspace = new ywot.Space();
  let curspace = new ywot.Space();
  newspace.data = [space, date, time, space, space, space, space, space]
  curspace.fromtile(tile);
  newspace.sub(curspace);
  main.write(newspace.towrite(tiley,tilex));
}
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
},"time":(tiley,tilex,tile)=>{
  rsrv(gettime, [tiley,tilex]);
  gettime(tiley,tilex,tile);
}};

//Reservations by omega commands:
var rsrvcmds = {}; //Callbacks to be run if a tile claimed by an omega command is edited
var rsrvtiles = []; //Those tiles which omega commands claim
function rsrv(cmd,tile){
  rsrvtiles.push(tile);
  rsrvcmds[tile] = cmd;
}
function unrsrv(cmd,tile){ //Currently runs on a crazy slow indexOf system, but sorting optimizations should/could be added if necessary
  rsrvtiles.splice(indexOf(tile),1);
  rsrvcmds[tile] = false;
}

var curcmds = []; //Current blocks to run commands in
var old = {}; //Old data which back be replaced by the command "back"
main.on('tileUpdate',(sender,source,tiles,tilekeys)=>{
  console.log('tileUpdate');
  if (sender == thissender){ //Prevents infinite recursion on its own edits
    return 0;
  }
  let valid = tilekeys.filter(tile => (tile[0] >= -2 && tile[0] <= 1 && tile[1] >= -2 && tile[1] <= 1)); //Main protected area
  if (true){ //just for readability/collapsing; handles alert edits
    for (i=0; i<valid.length; i++){
      curtile = new ywot.Space();
      curtile.fromtile(tiles[valid[i]].content);
      tilespace = alert.gettile(valid[i][0]+2,valid[i][1]+2).sub(curtile);
      main.write(tilespace.towrite(valid[i][0],valid[i][1]));
    }
  }
  let rsrvdo = tilekeys.filter(tile => rsrvtiles.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile))); //Checks if in rsrv
  if (valid.length == 0){ //reserved tiles handling
    for (i=0; i<rsrvdo.length; i++){
      let cmd = rsrvdo[i];
      rsrvcmds[cmd](cmd[0],cmd[1],tiles[cmd].content);
    }
  }
  let omegapos = tilekeys.filter(tile => tiles[tile].content.includes('Ω'));
  if (rsrvdo.length == 0 && valid.length == 0){ //handles omega calls
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
  let docmds = tilekeys.filter(tile => curcmds.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile))); //List of edited tiles which have been recently omega'd
  if (omegapos.length == 0 && rsrvdo.length == 0 && valid.length == 0){ //handles calls in omega boxes
    for (i=0; i<docmds.length; i++){
      let cmd = docmds[i]; //A given edited tile which has been omega'd
      console.log(cmd);
      for (j=0; j<Object.keys(cmdkeys).length; j++){ //Iterates through callback functions and each command caller name
        if (tiles[cmd].content.includes(Object.keys(cmdkeys)[j])){ //If the given edited tile has the cmd caller name
          Object.values(cmdkeys)[j](cmd[0],cmd[1],tiles[cmd].content); //Calls callback; gives coordinates
        }
      }
    }
  }
});
