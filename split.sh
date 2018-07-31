#!/bin/bash

minx=$1;
miny=$2;
txt=$( cat $3 );
linenum=0;
curline=0;
x=0;
echo '' > split.txt;
linedata='';
declare -a lineend;

new=$'\n';
echo 'cont' > mode.txt;
echo "$1$new$2$new$3${new}0 0" > dim.txt;
while [[ $( cat mode.txt ) == 'cont' ]]; do
  python3 split.py > split.txt; #split.py outputs region, modifies dim.txt to the next "region," and sets mode.txt to end if all regions have been listed.
  ./prpaste.sh $( sed '4s/.*/&/' dim.txt ) split.txt;
done
