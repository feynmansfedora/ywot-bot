const ywot = require('./ywot.js');
const fs = require('fs');
const assert = require('assert');

//Meant to test all Space functions

let alert = new ywot.Space();
let newspace = new ywot.Space(); newspace.data = [[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','k','','','','',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' '],[' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ']];
let box = new ywot.Space();
//readfile
alert.readfile('./alert.txt');
box.readfile('./cmdbox.txt');
let testfile = new ywot.Space(); testfile.readfile('./test.txt');
let smalltest = new ywot.Space(); smalltest.readfile('./smalltest.txt');
assert(JSON.stringify(alert.data[0]) == JSON.stringify(['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_']));
assert(JSON.stringify(alert.data[16]) == JSON.stringify(['|',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','|']));
//tilelength
/*assert(alert.tilelength()[0] == 4);
assert(alert.tilelength()[1] == 4);
assert(newspace.tilelength()[0] == 1);
assert(newspace.tilelength()[1] == 2);*/
//fromfetch is mostly used in integration, so won't be tested here
//writefile

//fromtile

//comb
let charcomb = (char1,char2)=>{
  if (char2 == ''){
    return char1;
  }
  return char2;
}
let testsum = testfile.comb(smalltest,charcomb,0,0,-1,-1);
console.log(testsum.data[9]);
assert(JSON.stringify(testsum.data[2]) == JSON.stringify([]));
//combto is just a wrapper

//gettile

//getrange

//towrite

//sub is just a wrapper
//add is just a wrapper
//addto is just a wrapper
