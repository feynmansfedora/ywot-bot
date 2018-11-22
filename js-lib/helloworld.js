const ywot = require(./ywot.js); //Includes main library
var client = new ywot.YWOT(); //Global websocket manager
var main = ywot.openworld('testworld'); //This function is required to interface with specific worlds, in this case
//https://www.yourworldoftext.com/testworld. Go check for the results there.
var textspace = new ywot.Space(); //The main spatial manipulation object in ywot
textspace.readfile('./helloworld.txt'); //Reads the local helloworld.txt file into the Space's data

main.on('on', ()=>{ //Runs when the world websocket is initialized
  let writedata = textspace.towrite(0,0); //Generates a well-structured array of characters and positions based on internal data
  //                                ^Coordinates
  main.write(writedata); //Pushes the write out to the yourworldoftext world
});

//Go check out the world now. It should be changed.
