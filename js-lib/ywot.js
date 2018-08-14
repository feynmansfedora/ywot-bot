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
      var sock = new ws(`ws://www.yourworldoftext.com/ws/`);
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
    setInterval(()=>{
      if (pushqueue.length > 0){
        console.log(pushqueue);
        pushqueue.shift().servpush();
        console.log(pushqueue.length);
      }
      else{
        this.emit('free');
      }
    }, 750)
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
    function newqueue(data,lrg){
      client.newpush(lrg);
      pushqueue.push(data);
    }
    this.setsock = function(sockin){
      sock = sockin;
      ws.onclose = function(e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function() {
          asock = new ws(`ws://www.yourworldoftext.com/ws/`);
          asock.on('open', () => {
            this.setsock(asock)
          })
        }, 10000);
      };

      ws.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        ws.close();
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
      sock.send(pushqueue.shift());
      console.log('servout', callbacks);
    }
    function unsafewrite(chars,lrg){
      for (var i=0; i<chars.length; i++){
        chars[i].splice(4,0,0);
        chars[i].push(i);
      }
      newqueue(`{"edits":${JSON.stringify(chars)},"kind":"write"}`, lrg);
    }
    this.write = function(chars){ //tileY, tileX, charY, charX, char
      console.log(chars);
      var batch = [];
      for (var i=0; i<chars.length; i++){
        if (batch.length == 200){
          unsafewrite(batch,this);
          batch = [];
        }
        batch.push(chars[i])
      }
      unsafewrite(batch,this);
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

function combine(charcomb, space1, space2){ //charcomb is character combinator (a function which combines two characters into a result); spaces are two strings which are combined

}

exports.YWOT = YWOT;
exports.World = World;
