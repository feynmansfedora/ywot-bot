/*ywot.js, the main file for the library*/

const ws = require('ws');
const fs = require('fs');
const EventEmitter = require('events');

class YWOT extends EventEmitter{ /*Manages connection frequency with the server*/
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
    this.emptyqueue = function(world){ //External function
      pushqueue = pushqueue.filter(item => {return item != world;});
      console.log('queue emptied');
    }
    setInterval(()=>{ //Primary function: gives server commands
      if (pushqueue.length > 0){
        pushqueue.shift().servpush(); //Treats pushqueue list like a queue, and runs servpush (hands cmd to server)
        //servpush is in target object (like World), so multiple worlds can be handled
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
    var writequeue = new Set(); //Packs writes to maximum accepted by server optimally
    var sockclosed = false; //If the sock is closed, pushes requests back to YWOT
    var self = this; //Good context for a .on command (ensures a callback to this obj)
    var cached = []; //The set of rectangles representing all positions which have been modified; note: sorted by miny then by minx
    var cachespace = new Space(); //The current internal cache of the world's state
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
    function getcached(minY,minX,maxY,maxX){ //Either gets the cached data over the given area or returns false
      if (modified) merge();
      if (iscached(minX,minY,maxX,maxY)){
        return cachespace.getrange(minX,minY,maxX,maxY);
      } else {
        return false;
      }
    }
    function contains(rectangle,point){ //Does the rectangle contain the given point?
      return (rectangle[0] <= point[0] && point[0] <= rectangle[2]) && (rectangle[1] <= point[1] && point[1] <= rectangle[3]);
    }
    function intersects(rectangle1,rectangle2){ //Do the rectangles intersect?
      //If minX1 < maxX2 && minX2 < maxX1, the two intervals x1 and x2 intersect.
      return (rectangle1[0] <= rectangle2[2] && rectangle2[0] <= rectangle1[2]) && (rectangle1[1] <= rectangle2[3] && rectangle2[1] <= rectangle1[3]);
    }
    function cornercheck(rectangle1,rectangle2){ //Does rectangle2 contain a point off one of the corners of rectangle1
      oncorner = false;
      if (contains(rectangle2,[rectangle1[0],rectangle1[1]+1])) oncorner = true;
      if (contains(rectangle2,[rectangle1[0]+1,rectangle1[1]])) oncorner = true;
      if (contains(rectangle2,[rectangle1[0],rectangle1[3]+1])) oncorner = true;
      if (contains(rectangle2,[rectangle1[0]+1,rectangle1[3]])) oncorner = true;
      if (contains(rectangle2,[rectangle1[2],rectangle1[1]+1])) oncorner = true;
      if (contains(rectangle2,[rectangle1[2]+1,rectangle1[1]])) oncorner = true;
      if (contains(rectangle2,[rectangle1[2],rectangle1[3]+1])) oncorner = true;
      if (contains(rectangle2,[rectangle1[2]+1,rectangle1[3]])) oncorner = true;
      return oncorner
    }
    function iscached(minX,minY,maxX,maxY){ //Is the region cached?
      let check = [minY,minX,maxY,maxX];
      let edgecheck = [];
      for (let i=0; i<=cached.length; i++){
        let rectangle = cached[i];
        if (!intersects(rectangle,check)){
          continue;
        }
        rectangle[0] = Math.min(rectangle[0],check[0]);
        rectangle[1] = Math.min(rectangle[1],check[1]);
        rectangle[2] = Math.min(rectangle[2],check[2]);
        rectangle[3] = Math.min(rectangle[3],check[3]);
        edgecheck.push(rectangle);
      }
      let coverrect = [];
      while (edgecheck.length > 1){
        rectangle = edgecheck[0];
        let corners = 8;
        if (rectangle[0] == check[0]) corners -= 2;
        if (rectangle[1] == check[1]) corners -= 2;
        if (rectangle[2] == check[2]) corners -= 2;
        if (rectangle[3] == check[3]) corners -= 2;
        for (i=1; i<=edgecheck.length; i++){
          if (cornercheck(rectangle,edgecheck[i])){
            corners -= 1
          }
          if (corners == 0){
            break;
          }
        }
        if (corners > 0){
          return false;
        } else {
          edgecheck.shift();
        }
      }
      return true;
    }
    function cachewrite(newdata,y,x){ //The handler for all new additions to cache; takes in a space and adds it, add y and x to
      mergeadd(newdata.tilelength(),y,x);
      cachespace.addto(newdata,cached[0][0],cached[0][1],y,x);
    }
    function mergeadd(datalength,y,x){
      let i = 0;
      while (i < cached.length && (cached[i][0] < y || cached[i][1] < x)){
        i += 1;
      }
      cached.splice(i,0,[y,x,datalength[0]+y,datalength[1]+x]);
      //TODO: actually merge rectangles (note: the way this algo works, optimization may be possible)
    }
    this.getwritequeue = function(){ //External getter to make writequeue private
      return writequeue;
    }
    this.setsock = function(sockin){ //Sets up error handling (and onclose retry), and message-handling
      sock = sockin;
      sock.onclose = retry;
      sock.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        sock.close();
      };
      sock.on('message', (message) => {
        message = JSON.parse(message);
        console.log('message');
        if (message.kind === 'fetch'){
          console.log('fetch');
          callback = callbacks.shift();
          var tiles = Object.keys(message.tiles);
          var content = Object.values(message.tiles);
          message = {};
          for (let i=0; i<tiles.length; i++){
            console.log('coordinate', i);
            if (content[i] === null){
              message[tiles[i]] = '                                                                                                                                ';
            }
            else{
              message[tiles[i]] = content[i].content;
            }
          }
          console.log('reassociated');
          dimension = dimensions.shift();
          console.log('made callback');
          spaceout = new Space();
          spaceout.fromfetch(message,dimension);
          cachewrite(spaceout,dimension[0],dimension[1]);
          callback(spaceout);
        }
        if (message.kind === 'channel'){ //Change to switch-case
          this.emit('channel', message.sender);
        }
        if (message.kind === 'cursor'){
          this.emit('cursor', message.positions, message.sender);
        }
        if (message.kind === 'tileUpdate'){
          let tilekeys = Object.keys(message.tiles).map(coord => coord.split(',').map(num => parseInt(num)));
          for (let i=0; i<tilekeys.length; i++){
            let tile = message.tiles[tilekeys[i]].content;
            let tilespace = new Space();
            tilespace.fromtile(tile);
            cachewrite(tilespace, tilekeys[i][0], tilekeys[i][1]);
          }
          this.emit('tileUpdate', message.sender, message.source, message.tiles, tilekeys);
        }
      });
      this.emit('on'); //tells program that World object is now active
    }
    this.servpush = function(){ //Never use outside of YWOT class; gives scheduled data to server
      if (sockclosed){ //Pushes back to YWOT (it'll retry later)
        client.newpush(this);
        return;
      }
      var queuetop = pushqueue.shift();
      if (queuetop === 'USE WRITEQUEUE'){ //Writequeue handler
        if (writequeue.size < 200){ //For minimum size writequeue (less than 200)
          let format = formatwrite(Array.from(writequeue));
          sock.send(format); //Sends all of writequeue
          writequeue = new Set();
          client.emptyqueue(this); //Removes all calls to World (in YWOT)
        }
        else{ //For larger writequeue
          var arraywritequeue = Array.from(writequeue);
          sock.send(formatwrite(arraywritequeue.splice(0,200))); //Sends 200 oldest items
          writequeue = new Set(arraywritequeue)
        }
      }
      else{//If it's not a write command, straight up sends it (like a fetch or cursor)
        sock.send(queuetop);
      }
    }
    function formatwrite(chars){ //Formats chars into pushable format
      for (let i=0; i<chars.length; i++){ //Iterates through characters, inserts a zero at the 4th position (for timestamp), and i at end for confirmation number
        chars[i].splice(4,0,0);
        chars[i].push(i);
      }
      return `{"edits":${JSON.stringify(chars)},"kind":"write"}`; //Externals
    }
    this.write = function(chars){ //tileY, tileX, charY, charX, char
      let oldlength = writequeue.size
      for (let i=0; i<chars.length; i++){
        writequeue.add(chars[i]);
      }
      for (let i=0; i<Math.floor(writequeue.size/200-oldlength/200)+1; i++){
        newqueue('USE WRITEQUEUE', this);
      }
    }
    this.fetch = function(coords, call){ //Makes a fetch request to server, calls callback when response is received
      cache = getcached(coords[0],coords[1],coords[2],coords[3]);
      if (cache) call(cache);
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
      for (let i=0; i<coords.length; i++){ //Loops through all sub-rectangles
        coords[i] = {"minY":coords[i][0], "minX":coords[i][1], "maxY":coords[i][2], "maxX":coords[i][3]} //Parses to correct format
      }
      newqueue(`{"fetchRectangles":${JSON.stringify(coords)},"kind":"fetch","v":"3"}`, this); //Queues cmd
      callbacks.push(call); //Adds the callback
      dimensions.push(coords); //Makes parsing easier later
    }
  }
}
function Space(){
  this.data = []
  function trim(array){ //Trims empty characters from either side of the array
    while(array[this.length-1] == ''){
      array.splice(-1,1);
    }
    return array
  }
  function padslice(array, min, max, padchar){ //This pads in extra characters outside of the range
    let curslice = []
    for (let i=min; i<max; i++){
      if (i<0 || i>array.length){
        if (typeof padchar == typeof []){
          curslice.push(padchar.slice(0));
        } else {
          curslice.push(padchar);
        }
      } else {
        curslice.push(array[i]);
      }
    }
    return curslice;
  }
  this.tilelength = function (){ //Returns [y,x] y and x being the respective vertical and horizontal lengths of the Space
    let y = Math.ceil(this.data.length/8);
    let x = Math.ceil(Math.max.apply(null,this.data.map(row => row.length))/16);
    return [y,x];
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
        console.log('converting at coordinate', x, y);
        var content = fetch[[x,y]];
        for (let i=0; i<8; i++){
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
    let rows = [[],[],[],[],[],[],[],[]];
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
    this.data = fs.readFileSync(filename, 'utf8').split('\n').slice(0,-1).map((row)=>{return splitesc(row);});
  }
  this.comb = function(otherspace, charcomb, y1=0, x1=0, y2=0, x2=0){
    var lcol = Math.min(x1,x2)*16; var uthis = Math.max.apply(null,this.data.map(row => row.length))+x1*16; var uotherspace = Math.max.apply(null,otherspace.data.map(row => row.length))+x2*16; var ucol = Math.max(uthis,uotherspace);
    var lrow = Math.min(y1,y2)*8; var urow = Math.max(this.data.length+y1*8,otherspace.data.length+y2*8);
    /*console.log(this.data.length,y1,otherspace.data.length,y2);
    console.log(lcol,lrow,ucol,urow);
    console.log(y1,x2,y2,x2);
    console.log(this.data.length,otherspace.data.length);*/
    console.log(lcol,lrow,ucol,urow);
    console.log(otherspace.data);
    //if (this.data.length > 0) console.log(this.data[0].length,otherspace.data[0].length)
    var newspace = [];
    for (var row=lrow; row<urow; row++){
      var newrow = []
      for (var col=lcol; col<ucol; col++){
        if (row < y1*8 || row >= this.data.length + y1*8 || col < x1*16 || col >= this.data[row - y1*8].length + x1*16){
          var char1 = '';
        } else {
          var char1 = this.data[row - y1*8][col - x1*16];
        }
        if (row < y2*8 || row >= otherspace.data.length + y2*8 || col < x2*16 || col >= otherspace.data[row - y2*8].length + x2*16){
          var char2 = '';
        } else {
          var char2 = otherspace.data[row - y2*8][col - x2*16];
        }
        //console.log(row,col,char1,char2);
        newrow.push(charcomb(char1,char2));
      }
      newspace.push(trim(newrow));
    }
    let newspace2 = new Space()
    newspace2.data = newspace;
    return newspace2;
  }
  this.combto = function(otherspace, charcomb, y1=0, x1=0, y2=0, x2=0){
    this.data = this.comb(otherspace, charcomb, y1=0, x1=0, y2=0, x2=0).data;
  }
  this.writefile = function(filename){ //Writes internal data to a file
    fs.writeFile(filename,this.data.map((row)=>{return row.join('');}).join('\n'),(err)=>{console.log(err);});
  }
  this.gettile = function(y,x){ //Returns the tile at the position (positive only, y+ down, x+ right), treating topleft as 0,0
    tilespace = new Space();
    tilespace.data = padslice(this.data,8*y,8*y+8,['&','&','&','&','&','&','&','&','&','&','&','&','&','&','&','&']).map((row) => {console.log(row); return padslice(row,16*x,16*x+16,'&')});
    return tilespace;
  }
  this.getrange = function(minY,minX,maxY,maxX){ //Similar to gettile, except with a range of tiles (returns '' for areas where there isn't one)
    tilespace = new Space();
    tilespace.data = padslice(this.data,8*minY,8*maxY,new Array(16*maxX-16*minX).fill('&')).map(row => padslice(row,16*minX,16*maxX,'&'));
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
    }, x1, y1, x2, y2);
  }
  this.add = function(otherspace, y1=0, x1=0, y2=0, x2=0){
    return this.comb(otherspace, (char1,char2)=>{
      if (char2 == ''){
        return char1;
      } else{
        return char2;
      }
    }, x1, y1, x2, y2);
  }
  this.addto = function(otherspace, y1=0, x1=0, y2=0, x2=0){ //Fix this later (create a GitHub issue)
    this.combto(otherspace, (char1,char2)=>{
      if (char2 == ''){
        return char1;
      } else{
        return char2;
      }
    }, y1, x1, y2, x2);
  }
}
exports.Space = Space

function CacheSpace(){
  this.linestart = [];
}

exports.YWOT = YWOT;
exports.World = World;
