const ywot = require('./ywot.js');

var client = new ywot.YWOT()
//var worlds = [{'world':client.openworld(),'thissource':'','sourcenotcalled':true, 'name':''}];
var worlds = [];
var worldnames = ['','~Seschient'];
worlds.push.apply(worlds,worldnames.map((name)=>{return {'world':client.openworld(name),'thissource':'','sourcenotcalled':true,'name':name};}));

var emptytile = `  this page now |
  closed to all |
  future inputs |
                |
                |
                |
 rekt ~meli     |
                |`.split('\n').map((row)=>{return row.split('').slice(0,16);});
/*var emptytile = `                |
                |
                |
                |
                |
                |
                |
                |`.split('\n').map((row)=>{return row.split('').slice(0,16);});*/

function channel(world){
  return (source)=>{
    if (world.sourcenotcalled){
      world.sourcenotcalled = false;
      world.thissource = source;
      console.log(world.thissource);
    }
  }
}
worlds.forEach((world)=>{world.world.on('channel', channel(world.world)); console.log(world);});

function onopen(world){
  return () => {
    world.sourcenotcalled = true;
  }
}
worlds.forEach((world)=>{world.world.on('on', onopen(world.world));});

var coordinates = new Set();
conquer = 0;
function tileUpdate(world){
  return (sender, source, tiles)=>{
    coords = Object.keys(tiles).filter((tile)=>{coordarray=tile.split(',').map((x)=>{return parseInt(x);}); return Math.abs(coordarray[0])<1000 && Math.abs(coordarray[1])<1000;});
    console.log('received ', coords.length, ' tiles\' updates (', coords, ';', Object.keys(tiles), '); writes remaining: ', world.getwritequeue().size);
    if (sender != world.thissource && coords.length > 0 && coords.length < 99){
      coordinates.add.apply(coordinates, coords);
      conquer += coords.length;
      console.log('overwritten ', conquer, ' tiles; overwritten ', coordinates.size, ' unique tiles.');
      var pretilewrite = coords.map((tile)=>{
        return ywot.combine((char1,char2)=>{
          if (char1 == char2){
            return '';
          }
          else{
            return char2;
          }
        },ywot.tile2space(tiles[tile].content),0,0,emptytile,0,0);
      });
      var tilewrite = {}; for (i=0; i<coords.length; i++){
        tilewrite[coords[i]] = pretilewrite[i];
      }
      pretilewrite1 = Object.keys(tilewrite).map((tile) => {
        newtile = []
        for (x=0; x<16; x++){
          for (y=0; y<8; y++){
            newtile.push([y,x,tilewrite[tile][y][x]]);
          }
        }
        return newtile;
      });
      tilewrite = {}; for (i=0; i<coords.length; i++){
        tilewrite[coords[i]] = pretilewrite1[i];
      }
      a = [].concat.apply([],coords.map((tile)=>{
        return tilewrite[tile].map((char) => {
          char.unshift(parseInt(tile.split(',')[1]));
          char.unshift(parseInt(tile.split(',')[0]));
          if (char[4] == ''){
            return '';
          }
          else{
            return char;
          }
        }
      ).filter((char)=>{return char!='';});}));
      world.write(a);
    }
  }
}
worlds.forEach((world)=>{world.world.on('tileUpdate', tileUpdate(world.world));});
