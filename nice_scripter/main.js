//Starts by clearing out the tiles immediately around centre (changes to a notification about the Ω character).
//Protects those tiles with the tileUpdate'r
//Responds to Ω with an empty box.

//Libraries:
const ywot = require('../main/ywot.js');
const fs = require('fs');

//Client, worlds, and text alerts/files
var client = new ywot.YWOT();
var main = client.openworld('');
var alert = new ywot.Space();
var passkey = client.openworld(fs.readFileSync(__dirname + '/.key.txt', 'utf8').split('\n')[0]); //World which contains passkey; put the world where it puts the key in the first line of .key.txt
alert.readfile(__dirname + '/alert.txt');
var cmdbox = new ywot.Space();
cmdbox.readfile(__dirname + '/cmdbox.txt');

//Trivial promises
var coords = {"tileY":58301,"tileX":-20184,"charY":2,"charX":4}
main.on('on',()=>{
  main.cursor(coords);
});

//Self-identification
var thissender;
main.on('cursor',(positions,sender)=>{
  let pos = positions[0];
  if (pos.tileY == coords.tileY && pos.tileX == coords.tileX && pos.charY == coords.charY && pos.charX == coords.charX){
    thissender = sender;
    main.on('cursor',(positions,sender)=>{return 0;});
    main.write(alert.towrite(-2,-2)); //also limit responder
  }
});

//"User-defined" tools:


//Variables/constants
var elevateduser = ''; //The user account with elevated priveleges (me)
var curpass;
var old = {}; //Old data which back be replaced by the command "back" or "bsck"

//Predefined spaces:
let hashspace = new ywot.Space();
hashspace.fillchar('#');
let passnotice = new ywot.Space();
passnotice.fillchar(' ');
passnotice.data[1] = '|Pass \\n:       '.split('');
passnotice.data[2] = ['','','','','','','','','','','','','','',''];
passnotice.data[7] = ' Incorrect pass. '.split('');
let empty = new ywot.Space();
empty.fillchar(' ');


//Callbacks for if these strings are ever seen in an omega tile
var cmdkeys = {"back":(data, sender, tile)=>{
  let tilereplace = new ywot.Space();
  tilereplace.fromtile(old[data.pos].replace('Ω',' '));
  main.cwrite(tilereplace, tile, data.pos[0], data.pos[1]);
  unrsrv(data.pos);
},"bsck":(data, sender, tile)=>{
  let tilereplace = new ywot.Space();
  tilereplace.fromtile(old[data.pos]);
  main.cwrite(tilereplace, tile, data.pos[0], data.pos[1]);
  unrsrv(data.pos);
},"time":(data, sender, tile)=>{
  function gettime(){

  }
  if (data.called == 0){
    data.start = Date.now();
  }
  setTimeout(()=>{unrsrv(data.pos);},600*1000);
  let today = new Date();
  let date = ('  ' + today.toISOString().substring(0,10)).padEnd(14, ' ').split('');
  let time = ('  ' + today.toISOString().slice(11,19) + 'Z').padEnd(14, ' ').split('');
  let remain = ('  secs: ' + Math.floor(600-(Date.now()-data.start)/1000).toString().padStart(4, '0') + '    ').split('');
  let space = Array(16).fill(' ');
  let newspace = new ywot.Space();
  let curspace = new ywot.Space();
  newspace.data = [space, date, time, space, space, space, remain, space];
  curspace.fromtile(tile);
  newspace.sub(curspace);
  main.cwrite(newspace, tile, data.pos[0], data.pos[1]);
},"auth":(data, sender, tile)=>{
  if (data.called == 0){
    curpass = '';
    var posschar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    for (let i=0; i<16; i++) curpass += posschar.charAt(Math.floor(Math.random()*posschar.length));
    let passprint = new ywot.Space();
    passprint.fillchar(' ');
    passprint.data[1] = curpass;
    passkey.write(passprint.towrite(0,0));
  }
  console.log('curpass', curpass);
  console.log('attempted pass', tile.substring(32,48));
  if (tile.substring(32, 48) == curpass){
    main.cwrite(hashspace, tile, data.pos[0], data.pos[1]);
    elevateduser = sender; //what priveleges does an elevated user have?
    console.log('user elevated');
    unrsrv(data.pos); //Unreserves if password typed in
  } else {
    main.cwrite(passnotice, tile, data.pos[0], data.pos[1]);
  }
},"send":(data, sender, tile)=>{ //Reserve a tile for elevated users
  if (sender == elevateduser && !data.elevated){
    console.log('user is priveleged');
    data.elevated = true
    data.store = tile
  }
  if (sender != elevateduser && !data.elevated){
    return 0;
  }
  if (sender == elevateduser && data.elevated){
    let space = new ywot.Space();
    space.fromtile(tile);
    data.store = space;
    if (tile.includes('STOPSTOPSTOP')) unrsrv(data.pos);
  }
  if (sender != elevateduser && data.elevated){
    main.cwrite(data.store, tile, data.pos[0], data.pos[1]);
  }
},"missile":(data,sender,tile)=>{ //Sends the left block (whatever is in it) non-destructively to the right for 1000 blocks
  let newspace = new ywot.Space();
  data.fin = false;
  newspace.frominstruct('Welcome to mission control. Put anything to the left and type go when ready');
  main.cwrite(newspace, tile, data.pos[0], data.pos[1]);
  main.fetch([data.pos[0],data.pos[1]-1,data.pos[0],data.pos[1]+999], (space)=>{
    data.missile = space.gettile(0, 0);
    data.cur = space.getrange(0, 1, 0, 1000);
    data.fin = true;
  })
  if (tile.includes('go') && data.fin){
    newbg((newdata)=>{
      if (newdata.new){
        newdata.new = false;

      } else {

      }
    }, data.pos, {"new":true,"curtile":{}}) //hmm how can the data stay up to date??
  }
}};

//Reservations by omega commands:
var rsrvcmds = {}; //Callbacks to be run if a tile claimed by an omega command is edited
var rsrvtiles = []; //Those tiles which omega commands claim
function rsrv(cmd,tile){
  if (rsrvtiles.indexOf(tile) != -1){
    rsrvcmds[tile].push(cmd);
  }
  console.log('cmd', cmd);
  rsrvtiles.push(tile);
  rsrvcmds[tile] = [cmd];
}
function unrsrv(tile, func){ //Removes func as a call from tile
  ind = rsrvtiles.indexOf(tile);
  if (rsrvtiles[ind] && rsrvtiles[ind].length > 1){
    rsrvtiles[ind].splice(rsrvtiles[ind].indexOf(func));
  } else {
    rsrvtiles.splice(ind,1);
    rsrvcmds[tile] = false;
  }
}
function callrsrv(tile, send, content){ //Calls all funcs associated with a tile
  let cmds = rsrvcmds[tile]; //List of all cmds for the specific tile
  for (i=0; i<rsrvcmds[tile].length; i++){
    cmd = cmds[i]; //Whichever cmd is selected
    cmd.call(cmd.data, send, content);
    cmd.data.called += 1;
  }

}
var curcmds = []; //Current blocks to run commands in (after omega assignment)

//User interaction handler
//TODO: simplify with external functions
main.on('tileUpdate',(sender,source,tiles,tilekeys)=>{
  console.log('tileUpdate');
  if (sender == thissender){ //Prevents infinite recursion on its own edits
    return 0;
  }
  console.log(sender, thissender);

  //Protects alert message from vandalism
  let valid = tilekeys.filter(tile => (tile[0] >= -2 && tile[0] <= 1 && tile[1] >= -2 && tile[1] <= 1)); //Main protected area
  for (i=0; i<valid.length; i++){
    tilespace = alert.gettile(valid[i][0]+2,valid[i][1]+2);
    main.cwrite(tilespace, tiles[valid[i]].content, valid[i][0],valid[i][1]);
  }
  if (valid.length != 0) return 0;

  //Checks if a "reserved" square for a previous command and updates it with that command's callback
  let rsrvdo = tilekeys.filter(tile => rsrvtiles.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile)) && rsrvcmds[tile]);
  for (i=0; i<rsrvdo.length; i++){
    let cmd = rsrvdo[i];
    callrsrv(cmd, sender, tiles[cmd].content);
  }
  if (rsrvdo.length != 0) return 0;

  //Creates omega box image and records the location of the box
  let omegapos = tilekeys.filter(tile => tiles[tile].content.includes('Ω'));
  for (i=0; i<omegapos.length; i++){
    let coord = omegapos[i]; //abbreviation for the coordinate being examined
    let data = tiles[coord]; //data about that tile handed from the server
    let content = data.content //abbreviation for the chars in the tile
    old[coord] = content;
    rsrv({"data":{"called":0,"pos":coord[i]},"call":(data,sender,tile)=>{ //Replaces docmds as a command attributor; if the tile is edited, then the command is run.
      let cmds = Object.keys(cmdkeys); //every callback function's name
      for (j=0; j<cmds.length; j++){ //Iterates through callback functions and each command caller name
        if (tile.includes(cmds[j])){ //If the given edited tile has the cmd caller name
          unrsrv(data.pos);
          rsrv({"data":{"called":0,"pos":data.pos},"call":Object.values(cmdkeys)[j]},omegapos[i]);
          callrsrv(data.pos, sender, tile); //Calls callback; gives coordinates
          }
        }
      }
    },omegapos[i]);
    main.cwrite(cmdbox, content, parseInt(coord[0]), parseInt(coord[1]));
  }
  if (omegapos.length != 0) return 0;
});

//Background commands:
bgcmds = []; //Queue of bgcmds structured as {"data","call"}
function newbg(call, pos, init, priority=false){
  init.pos = pos;
  init.time = Date.now();
  if (priority){
    bgcmds.unshift({"data":init,"call":call});
  } else {
    bgcmds.push({"data":init,"call":call});
  }
}

client.on('free',()=>{
  let cmd = bgcmds.shift();
  if (cmd){
    cmd.call(cmd.data);
  }
});
