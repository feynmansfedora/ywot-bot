#!/bin/bash

cd ~/Desktop/ywot;
xch=$1;
ych=$2;
txt=$( cat ./pastes/$3 );
edits="[";
declare -a fulledit;
editind=0;
line=0;
len=$((${#txt}-1));
col=0;
size=200;
amt=0;
time=$(date +"%s"); time+="000"; time="0";
for (( i=0; i<=len; i++)); do
	dchar=${txt:$i:2}
	char=${dchar:0:1};
	subchar=$(($col%16));
	subline=$(($line%8));
	hch=$((($col-$subchar)/16));
	vch=$((($line-$subline)/8));
	if [[ "$char" == $'\n' ]]; then
		line=$(($line+1));
		col=0;
	else if [[ "$dchar" == '\&' || "$dchar" == '\\' ]]; then
		i=$(($i+1));
		edits+="[$(($vch+$ych)),$(($hch+$xch)),$subline,$subchar,0,\"${dchar:1:2}\",$i], ";
		col=$(($col+1));
		amt=$(($amt+1));
	else if [[ $char == '&' ]]; then
		col=$(($col+1));
	else if [[ $char == '"' ]]; then
		edits+="[$(($vch+$ych)),$(($hch+$xch)),$subline,$subchar,0,\"\\\"\",$i], ";
		col=$(($col+1));
		amt=$(($amt+1));
	else
		edits+="[$(($vch+$ych)),$(($hch+$xch)),$subline,$subchar,0,\"$char\",$i], ";
		col=$(($col+1));
		amt=$(($amt+1));
	fi; fi; fi; fi;
	if [[ $(($amt%$size)) -eq $(($size-1)) ]]; then
		edits=${edits:0:${#edits}-2};
		out="{\"edits\":$edits], \"kind\":\"write\"}";
		out+=$'\n'
		fulledit[$editind]=$out;
		edits="[";
		editind=$(($editind+1));
		amt=0;
		echo $i;
	fi;
done;
edits=${edits:0:${#edits}-2};
out="{\"edits\":$edits], \"kind\":\"write\"}";
out+=$'\n'
fulledit[$editind]=$out;
edits="";

time=0.5;

{ sleep 1; for (( i=0; i<=$editind;  i++ )); do echo ${fulledit[$i]}; sleep $time; done; } | wscat -c "ws://www.yourworldoftext.com$4/ws/" > file.txt;
