#!/bin/bash

new=$'\n';

cp ret.txt in.txt && #Copies server output
echo "$1$new$2$new$3" > dim.txt && #Pushes dimensions to dim.txt for fetch.py inputs
echo 'cmd' > mode.txt && #Inputs to fetch.py to print fetch request
python3 fetch.py && #Pushes fetch request to the server
sleep 1 && #Waits for server return
comm -23 ret.txt in.txt > out.txt && #Removes old data (before fetch -- setting to only fetch request)
sed -i '' 's/^> //'  out.txt && #Removes wscat angle bracket syntax (per cmd)
echo 'read' > mode.txt && #Sets fetch.py to return full dimensions (incl. maxX/maxY)
python3 fetch.py > in.txt && #Puts full dimensions in in.txt
cp in.txt dim.txt && #Copies in.txt to dim.txt such that parse.py can use it (can't output to an input)
python3 parse.py > in.txt && #Puts snapshot of world in in.txt
sed 's/[\&]/\\&/g' < in.txt > out.txt && #Escapes characters from in.txt to out.txt
./sub.sh out.txt $1 $2 $3 $1 $2 min.txt tru && #Subtracts snapshot from intended writing (returning necessary changes to min.txt)
echo "./min.txt" > file.txt && #Location of tiles to be printed to YWoT (for prparse.py)
echo "$1$new$2" > dim.txt && #Dimensions for prparse.py
python3 prparse.py > in.txt; #commands to push to server (if any command fails, this command fails)
