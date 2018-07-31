#!/bin/bash

new=$'\n'
echo "pastes/$3" > file.txt;
echo "$1$new$2" > dim.txt;
cmds=$(python3 prparse.py);
IFS=$'\n'

while [[ 1 ]]; do date +%s;
{ sleep 2;
for word in $cmds; do
  echo $word;
  sleep 1;
done;
} | wscat -c "ws://www.yourworldoftext.com$4/ws/" > ret.txt;
done;
