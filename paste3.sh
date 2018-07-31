#!/bin/bash

new=$'\n';
echo "$3" > file.txt;
IFS=$'\n';

while [[ 1 ]]; do date +%s;
{ sleep 2;
while [[ 1 ]]; do
cp ret.txt in.txt ; echo "$1$new$2${new}$3" > dim.txt; echo 'cmd' > mode.txt;  python3 fetch.py; sleep 1;
comm -23 ret.txt in.txt > out.txt; sed -i '' 's/^> //'  out.txt; echo 'read' > mode.txt; python3 fetch.py > in.txt;
cp in.txt dim.txt; python3 parse.py > in.txt; sed 's/[\&]/\\&/g' < in.txt > out.txt;
./sub.sh out.txt $1 $2 $3 $1 $2 min.txt tru; echo "./min.txt" > file.txt; echo "$1$new$2" > dim.txt;
cmds=$(python3 prparse.py);
for word in $cmds; do
  echo $word;
  sleep 1;
done;
done;
} | wscat -c "ws://www.yourworldoftext.com$4/ws/" > ret.txt;
done;
