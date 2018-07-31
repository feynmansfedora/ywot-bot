new=$'\n';
echo "$1$new$2$new$3$new$4" > dim.txt;

{ sleep 1; echo "{\"fetchRectangles\":[{\"minY\":$1,\"minX\":$2,\"maxY\":$3,\"maxX\":$4}],\"kind\":\"fetch\",\"v\":\"3\"}"; sleep 3; } | wscat -c "ws://www.yourworldoftext.com$5/ws/" > out.txt;
sed 's/^> //' < out.txt > in.txt; cp in.txt out.txt;
python3 parse.py > file.txt;
