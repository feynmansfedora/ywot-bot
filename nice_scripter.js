//Starts by clearing out the tiles immediately around centre (changes to a notification about the Ω character).
//Protects those tiles with the tileUpdate'r
//Responds to Ω with an empty box.

//Libraries:
const ywot = require('./ywot.js');
const fs = require('fs');

//Client, worlds, and text alerts/files
var client = new ywot.YWOT();
var main = client.openworld('');
var alert = new ywot.Space();
var passkey = client.openworld(fs.readFileSync('.key.txt', 'utf8').split('\n')[0]); //World which contains passkey; put the world where it puts the key in the first line of .key.txt
alert.readfile('./alert.txt');
var cmdbox = new ywot.Space();
cmdbox.readfile('./cmdbox.txt');

//Trivial promises
main.on('on',()=>{
  main.write(alert.towrite(-2,-2));
});
var thissender;
main.on('channel',(sender)=>{thissender = sender;});

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

//Functions and callbacks from cmdkeys
function gettime(user, tiley, tilex, tile){
  console.log('gettime called');
  let today = new Date();
  let date = ('  ' + today.toISOString().substring(0,10)).padEnd(16, ' ').split('');
  let time = ('  ' + today.toISOString().slice(11,19) + 'Z').padEnd(16, ' ').split('');
  let space = Array(16).fill(' ');
  let newspace = new ywot.Space();
  let curspace = new ywot.Space();
  newspace.data = [space, date, time, space, space, space, space, space];
  curspace.fromtile(tile);
  newspace.sub(curspace);
  main.cwrite(newspace, tile, tiley, tilex);
}
function passcheck(user, tiley, tilex, tile){ //checks if correct passcode is entered
  console.log('passcheck called at',tiley,tilex);
  console.log('curpass', curpass);
  console.log('attempted pass', tile.substring(32,48));
  if (tile.substring(32, 48) == curpass){
    main.cwrite(hashspace, tile, tiley, tilex);
    elevateduser = user; //what priveleges does an elevated user have?
    console.log('user elevated');
    unrsrv([tiley,tilex]); //Unreserves if password typed in
  } else {
    main.cwrite(passnotice, tile, tiley, tilex);
  }
}
function inputhold(user, tiley, tilex, tile){
  main.cwrite(empty,tile,tiley,tilex);
  console.log('inputhold')
  if (tile.substring(127,128) == '&'){
    unrsrv([tiley,tilex]);
    rsrv(buffer,[tiley,tilex]);
    main.fetch([tiley, tilex-1, tiley, tilex-1],(space)=>{
      unrsrv([tiley,tilex]);
      rsrv((user0,tiley0,tilex0,tile0)=>{
        hold(space,tile0,tiley,tilex);
      },[tiley,tilex]);
      hold(space,tile0,tiley,tilex);
    });
  }
}
function hold(space, tile, tiley, tilex){
  console.log('athold');
  main.cwrite(space, tile, tiley, tilex);
}
function buffer(user, tiley, tilex, tile){
  load = new ywot.Space();
  load.fillchar(' ')
  load[1] = '   ..........   '.split('');
  main.cwrite(load, tile, tiley, tilex);
}

//Callbacks for if these strings are ever seen in an omega tile
var cmdkeys = {"back":(user, tiley,tilex,tile)=>{
  let tilereplace = new ywot.Space();
  tilereplace.fromtile(old[[tiley,tilex]].replace('Ω',' '));
  main.cwrite(tilereplace, tile, tiley, tilex);
},"bsck":(user,tiley,tilex,tile)=>{
  let tilereplace = new ywot.Space();
  tilereplace.fromtile(old[[tiley,tilex]]);
  main.cwrite(tilereplace, tile, tiley,tilex);
},"time":(user,tiley,tilex,tile)=>{
  rsrv(gettime, [tiley,tilex]);
  gettime(tiley,tilex,tile);
  setTimeout(()=>{unrsrv([tiley,tilex]);},600*1000);
  gettime(user,tiley,tilex,tile);
  setTimeout(()=>{unrsrv([tiley,tilex]);},30*1000);
},"elevate":(user,tiley,tilex,tile)=>{
  curpass = '';
  var posschar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  for (let i=0; i<16; i++) curpass += posschar.charAt(Math.floor(Math.random()*posschar.length));
  let passprint = new ywot.Space();
  passprint.fillchar(' ');
  passprint.data[1] = curpass;
  passkey.write(passprint.towrite(0,0));
  rsrv(passcheck, [tiley,tilex]);
  passcheck(user,tiley,tilex,tile);
},"message":(user,tiley,tilex,tile)=>{ //Reserve a tile for elevated users
  if (user == elevateduser){
    console.log('user is priveleged');
    rsrv(inputhold,[tiley,tilex]);
  }
}};

//Reservations by omega commands:
var rsrvcmds = {}; //Callbacks to be run if a tile claimed by an omega command is edited
var rsrvtiles = []; //Those tiles which omega commands claim
function rsrv(cmd,tile){
  rsrvtiles.push(tile);
  rsrvcmds[tile] = cmd;
}
function unrsrv(tile){ //Currently runs on a crazy slow indexOf system, but sorting optimizations should/could be added if necessary
  rsrvtiles.splice(rsrvtiles.indexOf(tile),1);
  rsrvcmds[tile] = false;
}
var curcmds = []; //Current blocks to run commands in (after omega assignment)

//User interaction handler
//TODO: simplify with external functions
main.on('tileUpdate',(sender,source,tiles,tilekeys)=>{
  console.log('tileUpdate');
  if (sender == thissender){ //Prevents infinite recursion on its own edits
    return 0;
  }

  let valid = tilekeys.filter(tile => (tile[0] >= -2 && tile[0] <= 1 && tile[1] >= -2 && tile[1] <= 1)); //Main protected area
  for (i=0; i<valid.length; i++){
    tilespace = alert.gettile(valid[i][0]+2,valid[i][1]+2);
    main.cwrite(tilespace, tiles[valid[i]].content, valid[i][0],valid[i][1]);
  }
  if (valid.length != 0) return 0;

  let rsrvdo = tilekeys.filter(tile => rsrvtiles.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile)) && rsrvcmds[tile]); //Checks if in rsrv
  for (i=0; i<rsrvdo.length; i++){
    let cmd = rsrvdo[i];
    rsrvcmds[cmd](sender,cmd[0],cmd[1],tiles[cmd].content);
  if (rsrvdo.length != 0) return 0;

  let omegapos = tilekeys.filter(tile => tiles[tile].content.includes('Ω')); //handles omega calls
  for (i=0; i<omegapos.length; i++){
    old[omegapos[i]] = tiles[omegapos[i]].content;
    curcmds.push(omegapos[i]);
    main.cwrite(cmdbox, tiles[omegapos[i]].content, parseInt(omegapos[i][0]), parseInt(omegapos[i][1]));
  }
  if (omegapos.length != 0) return 0;

  let docmds = tilekeys.filter(tile => curcmds.map(tile1 => JSON.stringify(tile1)).includes(JSON.stringify(tile))); //List of edits in omega boxes
  for (i=0; i<docmds.length; i++){
    let cmd = docmds[i]; //A given edited tile which has been omega'd
    console.log(cmd);
    for (j=0; j<Object.keys(cmdkeys).length; j++){ //Iterates through callback functions and each command caller name
      if (tiles[cmd].content.includes(Object.keys(cmdkeys)[j])){ //If the given edited tile has the cmd caller name
        Object.values(cmdkeys)[j](sender,cmd[0],cmd[1],tiles[cmd].content); //Calls callback; gives coordinates
      }
    }
  }
});
