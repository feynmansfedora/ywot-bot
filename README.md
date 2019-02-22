# ywot-bot
This project is mostly an API to interface with [Your World of Text](https://www.yourworldoftext.com)'s servers. The rest of it is a series of bots to use the API and act as examples. To use it in your project, copy `js-lib/ywot.js` over to your project and make sure to have ws installed.
#### Dependencies
The only dependency is ws (and nodejs, obviously). This npm library can be installed globally with `sudo npm i -g ws` or locally with `npm i ws`.
#### Installation
For installation on virtually any Unix system:
[Installing nodejs and npm](https://blog.teamtreehouse.com/install-node-js-npm-linux)

Make sure you're in the right directory, then run the following commands:
```
git clone https://github.com/feynmansfedora/ywot-bot.git
sudo npm i -g ws
```
# Documentation
If you're looking for a quick introduction to how the API is structured, check out js-lib/helloworld.js that prints helloworld on [testworld](https://www.yourworldoftext.com/testworld). Otherwise, the full documentation is here.
It's written in node.js, and consists of three classes, lying heavily on the built-in [Event Emitter](https://nodejs.org/api/events.html):
The API has to be included with:
```javascript
const ywot = require(./ywot.js);
```
- [YWOT, bot check handler](#ywot)
- [World, individual world management](#world)
- [Space, 2D data management (such as pastes)](#space)
## YWOT
An extension of Event Emitter, this is the simplest class. All it does is prevent the server from "blocking" any script not running in parallel with another by slowly pushing data to the server.
Initialised as
```javascript
var client = new ywot.YWOT();
```
### Events:
- `free, ()` is emitted whenever there aren't any requests to the server. This is mostly used for background processes that run whenever nothing is happening. This includes no outputs.

Example code:
```javascript
client.on('free',()=>{
  console.log('I have nothing to do');
});
```
### Methods:
- `openworld(name)` opens a new connection at https://www.yourworldoftext.com/[name], and handles the setup of the websocket. It returns a World object that isn't yet initialised because the websocket may not have connected.

Example code:
```javascript
var main = client.openworld('testworld');
```
[To top](#documentation)
## World
Also an extension of Event Emitter, this is where every direct interface with the server occurs (and where the internals are hidden).
Initialised as:
```javascript
var main = client.openworld('worldnamehere'); //Relies on YWOT class for initialisation.
```
### Events:
- `channel, (sender)` is emitted whenever the yourworldoftext server hands a channel object to the client -- triggered at the start of every session to identify the client. This includes a sender string which acts as the ID for the client until the session has ended. It's used on tileUpdate and cursor as id for the session/sender.

Example code:
```javascript
var thissender;
main.on('channel', (sender)=>{
  thissender = sender; //Records the id of the client.
});
```
- `cursor, (positions, sender)` is emitted whenever the yourworldoftext server hands a cursor object to the client -- triggered when another user sends a cursor object along with the positions (this was mostly used for the synched up cursor highlights live on the page). It comes with positions and sender. Positions is structured as an array of coordinates {"tileY":0,"tileX":0,"charY":0,"charX":0}. Sender is the id.

Example code:
```javascript
main.on('cursor', (positions,sender)=>{
  for (i=0; i<positions.length; i++){
    console.log(sender, ' clicked at ', positions[i]);
  }
});
```
- `tileUpdate, (sender, source, tiles/content)` is emitted whenever the yourworldoftext server hands a tileUpdate object to the client -- triggered when any user updates the world. It comes with sender, source, and tiles (the content). Sender is the id. Tiles is a complex object indexed by the coordinates such as '0,0'. Every attribute contains .content, a standardized "tile" string -- characters representing an 8x16 region which can be fed into Space.fromtile(). It also has .properties.writability which I've only seen as null and .properties.cell_props which I've only seen as {}. Source is always "write," so far as I've seen. These are likely obsolete or abandoned features.

Example code:
```javascript
main.on('tileUpdate', (sender,source,tiles)=>{
  var tilekeys = Object.keys(tiles).map((coord)=>{return coord.split(',').map((num)=>{return parseInt(num);});});
  //^^^This should be included in order to get an array of the tiles which have been updated in an easy to use [y,x] form^^^
  for (i=0; i<tilekeys.length; i++){
    var tilespace = new Space();
    tilespace.fromtile(tilekeys[i].content);
    console.log(sender, ' edited the tile at ', tilekeys[i], ' to be ', tilespace.data);
  }
});
```
- `on` is emitted whenever the websocket initialises and the World object is usable. Don't try anything before this is emitted, as that will cause an error. This is extremely helpful for making announcements (pasting something to the main page on initialisation). It has no extra outputs.

Example code:
```javascript
main.on('on', ()=>{
  main.fetch([-100,0,100,0],(toprint)=>{
    console.log(toprint);
  });
})
```
### Methods:
- `write(chars)` takes an array of 5-item arrays, each of which is structured as [tileY, tileX, charY, charX, char]. It pushes the data to an internal queue which phases them out to the server. This can only be used after initialisation and thus should be used in an event.

Example code:
```javascript
main.on('on',()=>{
  var coolspace = new Space()
  coolspace.fromtile('                                                                                                                                '); //Sets an empty Space the size of a tile
  main.write(coolspace.towrite(-2,2)); //Replaces the tile at y=-2,x=2 with an empty tile when the bot turns on
});
```
- `fetch(coords,calls)` takes two inputs, coords=[minY,minX,maxY,maxX] and calls which receives a Space object containing all of the data from the fetch.

Example code:
```javascript
main.on('on',()=>{
  main.fetch([-100,0,100,0],(toprint)=>{
    console.log(toprint.data);
  }); //Prints the data the bot gets back from a request of tiles between (-100,0) and (100,0).
})
```
- `cwrite(newtile, oldtile, y, x)` writes newtile to the world efficiently or 'conservatively,' minimizing the number of characters sent to the server with a server-provided 'oldtile' tile string to subtract in order to determine which characters to send. It is send to the world at y, x

Example code:
```javascript
main.on('tileUpdate',(sender,source,tiles,tilekeys)=>{
  let blank = new ywot.Space();
  blank.fillchar(' ');
  for (let i=0; i<tilekeys.length; i++){
    main.cwrite(blank, tiles[tilekeys[i]], tilekeys[i][0], tilekeys[i][1]);
  }
}
```
- `cwrite2(newspace, oldspace, y, x)` performs the same function as cwrite but for two arbitrarily sized spaces (useful for writing against fetches). Also sent to the world at y, x

Example code:
```javascript
main.on('tileUpdate',(sender,source,tiles,tilekeys)=>{
  let blank = new ywot.Space();
  blank.fillchar(' ');
  for (let i=0; i<tilekeys.length; i++){
    let uselessspace = new ywot.Space();
    uselessspace.fromtile(tiles[tilekeys[i]])
    main.cwrite2(blank, uselessspace, tilekeys[i][0], tilekeys[i][1]);
  }
}
```
[To top](#documentation)
## Space
This is the text manager. It controls pastes, allows importing from and exporting to files, manipulation between Spaces, cutting out tiles. This is the entirety of text manipulation within the program. Because all it does is process text, it doesn't emit anything and is not an extension of Event Emitter. It does have plenty of methods, though. Notably, the coordinate axes run in odd directions. The x-axis points in the normal direction, but y is inverted (down is positive, up is negative). Also, in most cases y is delivered before x [y,x]. I haven't converted this, and it is recommended to leave this in native form for easy to understand code.
Initialised as:
```javascript
var space = new Space();
```
### Methods:
- `fromtile(tile)` formats a string without newlines representing the 8x16 primitive tile in YWOT. Generally used with tileUpdate to format the default output into a Space (edits the internal Space.data attribute).

Example code:
```javascript
space.fromtile('                                                                                                                                '); //Sets an empty Space the size of a tile (8x16)
```
- `readfile(filename)` takes a filename as input in the form of './path/to/file' or 'path/to/file' (as an input to fs.readFileSync). Edits the internal Space.data attribute so as to match the file's information -- treating ampersands as empty characters (not to be replaced) and escaped backslashes/ampersands as just backslashes or ampersands ('\\\\'->\\, '\\&'->&, &->'').

Example code:
```javascript
space.readfile('./alert.txt');
```
- `comb(otherspace, charcomb, y1=0, x1=0, y2=0, x2=0)` returns Space that is a combination of the object that is running .comb at y1,x1 (with positive y going downwards) and otherspace at y2,x2. For every overlapping character, charcomb(char1,char2) is run on (giving charcomb '' for the respective char at locations where one of either space is not present) the characters located there.

Example code:
```javascript
var otherspace = new Space();
otherspace.fromtile('yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&');
otherspace.comb(space, (char1,char2)=>{
    return char1;
})
```
- `writefile(filename,defaultchar='&')` takes the internal Space.data and outputs it to a file at filename structured as 'path/to/filename', replacing the empty characters with an '&', escaping ampersands and backslashes. with backslashes immediately before.

Example code:
```javascript
space.writefile('./licence.txt');
```
- `gettile(y,x)` gets the tile of Space at y,x y increasing going downwards and x increasing going rightwards. It outputs this as a space, and takes in y and x as numbers.

Example code:
```javascript
console.log(space.gettile(1,2).data);
```
- `towrite(tiley,tilex)` returns a well-structured write array which can easily be fed to World.write(chars). tiley,tilex is the displacement of the Space object.

Example code:
```javascript
main.write(space.towrite(1,2));
```
- `sub(otherspace, y1=0, x1=0, y2=0, x2=0)` is a specific comb with a charcomb that returns '' when the chars are the same or char1=='' and char1 otherwise.

Example code:
```javascript
var otherspace = new Space();
otherspace.fromtile('yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&');
otherspace.sub(space);
```
- `add(otherspace, y1=0, x1=0, y2=0, x2=0)` is a specific comb with a charcomb that returns char1 if char2 is '' and char2 otherwise.

Example code:
```javascript
var otherspace = new Space();
otherspace.fromtile('yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&yeah&&&&&&&&&&&&');
otherspace.add(space);
```
- `fillchar(char, y=1, x=1)` fills the given Space of size y by x with the char of choice. This is useful for generating text on the fly without having to dedicate a file to the paste.

Example code:
```javascript
var blank = new Space();
blank.fillchar('');
```
[To top](#documentation)
