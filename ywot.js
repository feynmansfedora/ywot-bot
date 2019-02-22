/*ywot.js, the main file for the library*/

const ws = require('ws');
const fs = require('fs');
const EventEmitter = require('events');

class YWOT extends EventEmitter{ //Manages connection frequency with the server
  constructor() {
    super();
    this.openworld = function(name){ //Handles websocket creation and houses new world function.
      if ( name === ''){ //Basic internal formatting (for YWOT)
        var sock = new ws('ws://www.yourworldoftext.com/ws/');
      }
      else {
        var sock = new ws(`ws://www.yourworldoftext.com/${name}/ws/`);
      }
      var world = new World(name, this); //Hands world proper object to call for functions like newpush
      sock.on('open', () => { //Asynch to finish handling websockets and trigger processes (for websocket error prevention -- like attempted use)
        world.setsock(sock)
      })
      return world; //An external function which makes it easy to run commands like main = ywot.openworld('');
    }
    var pushqueue = [];
    this.newpush = function(world){ //Used primarily by World to callback at a good frequency
      pushqueue.push(world);
    }
    this.emptyqueue = function(world){ //External function; empties queue for a given world.
      pushqueue = pushqueue.filter(item => {return item != world;});
      console.log('queue emptied');
    }
    setInterval(()=>{ //Primary function: gives server commands
      if (pushqueue.length > 0){
        pushqueue.shift().servpush(); //Treats pushqueue list like a queue, and runs servpush (hands cmd to server)
        //servpush is in target object (World), so multiple worlds can be handled
        //Prevents 403 error
        console.log('server communications remaining:', pushqueue.length, '; time:', +new Date()); //mainlog
      }
      else{
        this.emit('free'); //Background processes like filling in an area
      }
    }, 750)
  }
}

class World extends EventEmitter{
  constructor(name, client) {
    //Events:
    //channel (sender): server out
    //cursor (positions, sender): server out
    //tileUpdate (sender, source, tiles/content): server out
    //on: activation
    super();
    var sock; //Main websocket
    var callback; //For fetch callback
    var callbacks = []; //For fetch callback (queue for slow server response)
    var dimensions = []; //For fetch dimensions (queue for slow server response) -- easier parsing later
    var pushqueue = []; //Queue of things to push to server; triggered by YWOT.
    var writequeue = []; //Packs writes to maximum accepted by server optimally
    var sockclosed = false; //If the sock is closed, pushes requests back to YWOT
    var self = this; //Good context for a .on command (ensures a callback to this obj)
    function newqueue(data,lrg){ //Internal call to queue up in YWOT and add it to queue
      client.newpush(lrg);
      pushqueue.push(data);
    }
    function retry(e){ //Retries on socket closure (likely triggered by simultaneous web portal usage)
      sockclosed = true;
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
      setTimeout(function() {
        if ( name === ''){
          var asock = new ws('ws://www.yourworldoftext.com/ws/');
        }
        else {
          var asock = new ws(`ws://www.yourworldoftext.com/${name}/ws/`);
        }
        asock.on('open', () => {
          sockclosed = false;
          self.setsock(asock);
        })
        asock.onclose = retry;
        asock.onerror = function(err) {
          console.error('Socket encountered error: ', err.message, 'Closing socket');
          sock.close();
        };
      }, 1000); //Reconstructs websocket in 1 second
    }
    function messagehandler(message){ //Handles all incoming messages to world.
      message = JSON.parse(message);
      console.log('message');
      if (message.kind === 'fetch'){
        console.log('fetch');
        callback = callbacks.shift();
        var tiles = Object.keys(message.tiles);
        var content = Object.values(message.tiles);
        message = {};
        for (var i=0; i<tiles.length; i++){
          console.log('coordinate', i);
          if (content[i] === null){
            message[tiles[i]] = '                                                                                                                                ';
          }
          else{
            message[tiles[i]] = content[i].content;
          }
        }
        console.log('reassociated');
        let dimension = dimensions.shift();
        console.log('made callback');
        let spaceout = new Space();
        console.log(message, 'message');
        console.log(dimension, 'dimension');
        spaceout.fromfetch(message,dimension);
        callback(spaceout);
      }
      if (message.kind === 'channel'){ //Change to switch-case
        self.emit('channel', message.sender);
      }
      if (message.kind === 'cursor'){
        self.emit('cursor', message.positions, message.sender);
      }
      if (message.kind === 'tileUpdate'){
        self.emit('tileUpdate', message.sender, message.source, message.tiles, Object.keys(message.tiles).map(coord => coord.split(',').map(num => parseInt(num))));
      }
    }
    this.getwritequeue = function(){ //External getter to make writequeue private
      return writequeue;
    }
    this.setsock = function(sockin){ //Sets up error handling (and onclose retry), and message-handling --
      sock = sockin;
      sock.onclose = retry;
      sock.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        sock.close();
      };
      sock.on('message', messagehandler);
      this.emit('on'); //tells program that World object is now active
    }
    this.servpush = function(){ //Never use outside of YWOT class; gives scheduled data to server
      if (sockclosed){ //Pushes back to YWOT (it'll retry later)
        client.newpush(this);
        return;
      }
      var queuetop = pushqueue.shift(); //next request to push
      if (queuetop === 'USE WRITEQUEUE'){ //Writequeue handler
        if (writequeue.length < 200){ //For minimum size writequeue (less than 200)
          let format = formatwrite(writequeue);
          sock.send(format); //Sends all of writequeue
          writequeue = [];
          client.emptyqueue(this); //Removes all calls to World (in YWOT)
          //BUG: what about fetch????
        }
        else{ //For larger writequeue
          sock.send(formatwrite(writequeue.splice(0,200))); //Sends 200 oldest items
        }
      }
      else{//If it's not a write command, straight up sends it (like a fetch or cursor)
        sock.send(queuetop);
      }
    }
    function formatwrite(chars){ //Formats chars into pushable format
      for (var i=0; i<chars.length; i++){ //Iterates through characters, inserts a zero at the 4th position (for timestamp), and i at end for confirmation number
        chars[i].splice(4,0,0);
        chars[i].push(i);
      }
      return `{"edits":${JSON.stringify(chars)},"kind":"write"}`; //Externals
    }
    this.write = function(chars){ //tileY, tileX, charY, charX, char
      let oldlength = writequeue.length
      for (var i=0; i<chars.length; i++){
        writequeue.push(chars[i]);
      }
      for (var i=0; i<Math.floor(writequeue.length/200-oldlength/200)+1; i++){
        newqueue('USE WRITEQUEUE', this);
      }
    }
    this.fetch = function(coords, call){ //Makes a fetch request to server, calls callback when response is received
      console.log('fetch request added');
      function split(rectangle){ //A recursive function to split a rectangle into rectangles smaller than 1000
        let rects = [rectangle]
        let finrects = []
        while (rects.length > 0){
          rectangle = rects[0]
          if ((rectangle[2]-rectangle[0])*(rectangle[3]-rectangle[1]) <= 1000){ //End condition
            finrects.push(rectangle)
            rects.splice(0,1) //Correct?
          } else {
            if (rectangle[2]-rectangle[0] > rectangle[3]-rectangle[1]){ //Chooses larger side, cuts that in about half
              rects.push([rectangle[0],rectangle[1],Math.floor((rectangle[2]+rectangle[0])/2),rectangle[3]]);
              rects.push([Math.floor((rectangle[2]+rectangle[0])/2),rectangle[1],rectangle[2],rectangle[3]]);
            } else {
              rects.push([rectangle[0],rectangle[1],rectangle[2],Math.floor((rectangle[3]+rectangle[1])/2)]);
              rects.push([rectangle[0],Math.floor((rectangle[3]+rectangle[1])/2),rectangle[2],rectangle[3]]);
            }
          }
        }
        return finrects
      }
      coords = split(coords); //Transforms into server-usable coding
      for (var i=0; i<coords.length; i++){ //Loops through all sub-rectangles
        coords[i] = {"minY":coords[i][0], "minX":coords[i][1], "maxY":coords[i][2], "maxX":coords[i][3]} //Parses to correct format
      }
      newqueue(`{"fetchRectangles":${JSON.stringify(coords)},"kind":"fetch","v":"3"}`, this); //Queues cmd
      callbacks.push(call); //Adds the callback
      dimensions.push(coords); //Makes parsing easier later
    }
    this.cwrite = function(newtile, oldtile, y, x){ //conservative write; shortens design pattern for efficient writing (newtile = Space to add; oldtile = tile string originally there; y, x = location)
      let oldspace = new Space();
      oldspace.fromtile(oldtile);
      this.write(newtile.sub(oldspace).towrite(y,x));
    }
    this.cwrite2 = function(newspace, oldspace, y, x){ //cwrite but for arbitrarily sized spaces (newspace, oldspace = new and old spaces respectively; y,x = location)
      this.write(newspace.sub(oldspace).towrite(y,x));
    }
  }
}

function Space(){
  this.data = []
  function padslice(array, min, max, pad){
    sliced = array.slice(Math.max(min,0),Math.min(max,array.length-1));
    if (min < 0){
      for (let i=min; i<0; i++){
        let appcopy = pad.slice();
        sliced.unshift(appcopy);
      }
    }
    if (max > array.length-1){ //technically redundant but for readability
      for (let i=array.length-1; i<max; i++){
        let appcopy = pad.slice();
        sliced.push(appcopy);
      }
    }
    return sliced
  }
  this.fromfetch = function (fetch,dimension){ //Takes in a fetch (from the fetch callback), and edits internal data to match
    //Corrects to single dimension assuming requests always add up to a rectangle.
    minx = Math.min.apply(null, dimension.map(a => a.minX)); miny = Math.min.apply(null, dimension.map(a => a.minY));
    maxx = Math.max.apply(null, dimension.map(a => a.maxX)); maxy = Math.max.apply(null, dimension.map(a => a.maxY));
    var space = [];
    var rows = [[],[],[],[],[],[],[],[]]; //Eight rows to handle the size of a 'chunk' in content (note chunks are 16x8 x by y)
    var x = minx;
    var y = miny;
    console.log('received fetch to convert to space');
    while(y<=maxy){
      x = minx;
      rows = [[],[],[],[],[],[],[],[]];
      while (x<=maxx){
        console.log('converting at coordinate', y, x);
        var content = fetch[[y, x]];
        for (i=0; i<8; i++){
          rows[i].push.apply(rows[i], content.slice(i*16,i*16+16).split(''));
        }
        x++;
      }
      space.push.apply(space, rows);
      y++;
    }
    this.data = space;
  }
  this.fromtile = function(tile){ //Takes in a tile (string 16x8) and converts to internal data
    rows = [[],[],[],[],[],[],[],[]];
    for (x=0; x<16; x++){
      for (y=0; y<8; y++){
        rows[y].push(tile.split('')[y*16+x])
      }
    }
    this.data = rows;
  }
  this.readfile = function(filename){ //Reads an external file into internal data
    function splitesc(string){
      split = [];
      char = 0;
      while (true){
      	if (char >= string.length){
      		return split;
      	}
      	if (string[char] == '\\'){
      		split.push(string[char+1]);
      		char++;
      	} else if (string[char] == '&'){
          split.push('')
        } else {
      		split.push(string[char]);
      	}
      	char++;
      }
    }
     //reads file w/ error handling; splits by line and maps row into individual characters (good spacing)
    this.data = fs.readFileSync(filename, 'utf8').split('\n').slice(0,-1).map(row => splitesc(row));
  }
  this.comb = function(otherspace, charcomb, y1=0, x1=0, y2=0, x2=0){ //Adds another Space to it, and returns the sum.
    lrow1 = y1*8; lrow2 = y2*8; lcol1 = x1*16; lcol2 = x2*16; //The characters at which the spaces start
    var lrow = Math.min(lrow1,lrow2);
    var urow = Math.max(lrow1+this.data.length, lrow2+otherspace.data.length);
    var lcol = Math.min(lcol1,lcol2);
    var newspace = [];
    for (var row=lrow; row<urow; row++){
      var row1 = row-lrow1; //The row in this.data
      var row2 = row-lrow2; //The row in otherspace.data
      var newrow = []
      if(row1 >= 0 && row1 < this.data.length){
        var thisline = this.data[row1];
      } else {
        var thisline = [];
      }
      if (row2 >= 0 && row2 < otherspace.data.length){
        var otherline = otherspace.data[row2];
      } else {
        var otherline = [];
      }
      var ucol = Math.max(lcol1+thisline.length,lcol2+otherline.length);
      for (var col=lcol; col<ucol; col++){
        var col1 = col-lcol1;
        var col2 = col-lcol2;
        if(col1 >= 0 && col1 < thisline.length){ //BAD
          var char1 = thisline[col1]; //WRONG
        } else {
          var char1 = '';
        }
        if(col2 >= 0 && col2 < otherline.length){ //BAD
          var char2 = otherline[col2]; //WRONG
        } else {
          var char2 = '';
        }
        newrow.push(charcomb(char1,char2));
      }
      newspace.push(newrow);
    }
    let newspace2 = new Space()
    newspace2.data = newspace;
    return newspace2;
  }
  this.writefile = function(filename){ //Writes internal data to a file
    fs.writeFile(filename,this.data.map(row => row.join('')).join('\n'),(err)=>{console.log(err);});
  }
  this.gettile = function(y,x){ //Returns the tile at the position (positive only, y+ down, x+ right), treating topleft as 0,0
    tilespace = new Space();
    tilespace.data = padslice(this.data,8*y,8*y+8,['','','','','','','','']).map(row => padslice(row,16*x,16*x+16,''));
    return tilespace;
  }
  this.getrange = function(minY,minX,maxY,maxX){ //Similar to gettile, except with a range of tiles (returns '' for areas where there isn't one)
    tilespace = new Space();
    tilespace.data = padslice(this.data,8*minY,8*maxY,new Array(16*maxX-16*minX).fill('')).map(row => padslice(row,16*minX,16*maxX,''));
    return tilespace;
  }
  this.towrite = function(tiley,tilex){ //Outputs the "write" structure to be plugged into World.write().
    let write = [];
    for (row=0; row<this.data.length; row++){
      for (col=0; col<this.data[row].length; col++){
        if (this.data[row][col] != ''){
          write.push([tiley+Math.floor(row/8),tilex+Math.floor(col/16),row%8,col%16,this.data[row][col]]);
        }
      }
    }
    return write
  }
  this.sub = function(otherspace, y1=0, x1=0, y2=0, x2=0){
    return this.comb(otherspace,(char1,char2)=>{
      if (char1 == char2){
        return '';
      } else if (char1 == ''){
        return ''
      } else{
        return char1
      }
    }, x1, y1, x2, y2)
  }
  this.fillchar = function(char, y=1, x=1){ //Fills space x,y with char
    let row = Array(x*16).fill(char);
    this.data = []; //Clears out Space
    for (let i=0; i<y*8; i++){
      this.data.push(row.slice());
    }
  }
}
exports.Space = Space

exports.YWOT = YWOT;
exports.World = World;
