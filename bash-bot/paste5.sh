#!/bin/bash

echo "$3" > file.txt;
IFS=$'\n';

while [[ 1 ]]; do date +%s; err=1;
  { sleep 2;
  while [[ 1 ]]; do
    echo '' > in.txt;
    #./prpaste.sh $1 $2 $3;
    ./split.sh $1 $2 $3;
    cmds=$(cat in.txt);
    for word in $cmds; do #pushes write commands to server
      echo $word;
      sleep 1;
    done;
  done;
  } | wscat -c "ws://www.yourworldoftext.com$4/ws/" > ret.txt;
done;
