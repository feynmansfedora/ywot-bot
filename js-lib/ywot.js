/*ywot.js, the main file for the library*/

const ws = require('ws');
const fs = require('fs');
const EventEmitter = require('events');

class YWOT extends EventEmitter{ /*Manages connection frequency with the server*/
  constructor() {
    super();
    this.openworld = function(name){
      if ( name === ''){
        var sock = new ws('ws://www.yourworldoftext.com/ws/');
      }
      else {
        var sock = new ws(`ws://www.yourworldoftext.com/${name}/ws/`);
      }
      //var sock = new ws(`ws://www.yourworldoftext.com/ws/`);
      var world = new World(name, this);
      sock.on('open', () => {
        world.setsock(sock)
      })
      return world;
    }
    var pushqueue = [];
    this.newpush = function(world){
      pushqueue.push(world);
    }
    this.emptyqueue = function(world){
      pushqueue = pushqueue.filter(item => {return item == world;});
      console.log('queue emptied');
    }
    setInterval(()=>{
      if (pushqueue.length > 0){
        pushqueue.shift().servpush();
        console.log('server communications remaining:', pushqueue.length, '; time:', +new Date());
      }
      else{
        this.emit('free');
      }
    }, 800)
  }
}

class World extends EventEmitter{
  constructor(name, client) {
    super();
    var sock; //Main websocket
    var callback; //For fetch callback
    var callbacks = []; //For fetch callback (queue for slow server response)
    var dimension; //For fetch dimensions
    var dimensions = []; //For fetch dimensions (queue for slow server response)
    var pushqueue = []; //Queue of things to push to server; triggered by YWOT.
    var writequeue = [];
    var sockclosed = false;
    var self = this;
    function newqueue(data,lrg){
      client.newpush(lrg);
      pushqueue.push(data);
    }
    function retry(e){
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
      }, 1000);
    }
    this.setsock = function(sockin){
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
          dimension = dimensions.shift();
          console.log('made callback');
          callback(fetch2space(message,dimension));
        }
        if (message.kind === 'channel'){ //Change to switch-case
          this.emit('channel', message.sender);
        }
        if (message.kind === 'cursor'){
          this.emit('cursor', message.positions, message.sender);
        }
        if (message.kind === 'tileUpdate'){
          this.emit('tileUpdate', message.sender, message.source, message.tiles)
        }
      });
      this.emit('on');
    }
    this.servpush = function(){ //Never use outside of YWOT class.
      if (sockclosed){
        client.newpush(this);
        return;
      }
      var queuetop = pushqueue.shift();
      if (queuetop === 'USE WRITEQUEUE'){
        if (writequeue.length < 200){
          sock.send(formatwrite(writequeue));
          writequeue = [];
          client.emptyqueue(this);
        }
        else{
          sock.send(formatwrite(writequeue.splice(0,200)));
        }
      }
      else{
        sock.send(queuetop);
      }
    }
    function formatwrite(chars){
      for (var i=0; i<chars.length; i++){
        chars[i].splice(4,0,0);
        chars[i].push(i);
      }
      return `{"edits":${JSON.stringify(chars)},"kind":"write"}`;
    }
    this.write = function(chars){ //tileY, tileX, charY, charX, char
      var batch = [];
      for (var i=0; i<chars.length; i++){
        if (batch.length == 200){
          writequeue.push.apply(writequeue,batch);
          newqueue('USE WRITEQUEUE', this);
          batch = [];
        }
        batch.push(chars[i]);
      }
      writequeue.push.apply(writequeue,batch);
      newqueue('USE WRITEQUEUE', this);
      writequeue = writequeue.filter(function(item, pos) {
        return writequeue.indexOf(item) == pos;
      })
    }
    this.fetch = function(coords, call){
      console.log('fetch request added');
      for (var i=0; i<coords.length; i++){
        coords[i] = {"minY":coords[i][0], "minX":coords[i][1], "maxY":coords[i][2], "maxX":coords[i][3]}
      }
      newqueue(`{"fetchRectangles":${JSON.stringify(coords)},"kind":"fetch","v":"3"}`, this);
      callbacks.push(call);
      dimensions.push(coords);
    }

  }
}

function fetch2space(fetch,dimension){
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
       for (i=0; i<8; i++){
         rows[i].push.apply(rows[i], content.slice(i*16,i*16+16).split(''));
       }
       x++;
     }
     space.push.apply(space, rows);
     y++;
   }
   return space;
}
exports.fetch2space = fetch2space;

function tile2space(tile){
  rows = [[],[],[],[],[],[],[],[]];
  for (x=0; x<16; x++){
    for (y=0; y<8; y++){
      rows[y].push(tile.split('')[y*16+x])
    }
  }
  return rows;
}
exports.tile2space = tile2space;

function combine(charcomb, space1, x1, y1, space2, x2, y2){ //charcomb is character combinator (a function which combines two characters into a result); spaces are two strings which are combined
  var lcol = Math.min(x1,x2); var ucol = Math.max(Math.max.apply(null,space1.map((row)=>{return row.length;}))+x1,Math.max.apply(null,space2.map((row)=>{return row.length;}))+x2);
  var newspace = [];
  for (var row=Math.min(y1,y2); row<Math.max(space1.length+y1, space2.length+y2); row++){
    var newrow = []
    for (var col=lcol; col<ucol; col++){
      try{
        var char1 = space1[row][col];
      }
      catch(err){
        var char1 = '';
      }
      try{
        var char2 = space2[row][col];
      }
      catch(err){
        var char2 = '';
      }
      newrow.push(charcomb(char1,char2));
    }
    newspace.push(newrow);
  }
  return newspace;
}
exports.combine = combine;

function file2space(filename){
  data = fs.readFile(filename, (err)=>{console.log(err);});
  return data.split('\n').map((row)=>{return row.split('');});
}
exports.file2space = file2space;

function space2file(filename, space){
  data = space.map((row)=>{return row.join('');});
  fs.writeFile(filename, data.join('\n'));
}
exports.space2file = space2file;

function space2tiles(space){


}
exports.space2tiles = space2tiles;

exports.YWOT = YWOT;
exports.World = World;
