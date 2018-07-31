#!/bin/bash
#sub a.txt -10 -10 b.txt -3 -3 min.txt <transparent>; -- transparency is if regions below ampersands are included in minuend (b.txt is top)

dir="pastes/"
n=$'\n'
echo "$1$n$2$n$3$n$4$n$5$n$6$n$8" > dim.txt;

python3 sub.py > $7;
