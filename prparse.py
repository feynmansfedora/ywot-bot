#Creates write cmds to push to server from dimensions and requested tiles (art)
art = open(open('file.txt').read()[:-1]).read()
dim = open('dim.txt').readlines()

xch = int(dim[0])
ych = int(dim[1])
edits = "["
line = 0
col = 0
amt = 0

charnum = 0
while charnum < len(art):
    dchar = art[charnum:charnum+2]
    char = dchar[0]
    subchar = col%16
    subline = line%8
    hch = (col-subchar)/16
    vch = (line-subline)/8
    col += 1
    if char == '\n':
        line += 1
        col = 0
    elif dchar == '\&' or dchar == '\\\\':
        charnum += 1
        edits += '[' + str(int(vch+ych)) + ',' + str(int(hch+xch)) + ',' + str(subline) + ',' + str(subchar) + ',0,"' + dchar[1] + '",' + str(charnum) + '], '
        amt += 1
    elif char == '&':
        pass
    elif char == '"':
        edits += '[' + str(int(vch+ych)) + ',' + str(int(hch+xch)) + ',' + str(subline) + ',' + str(subchar) + ',0,"\\",' + str(charnum) + '], '
        amt += 1
    else:
        edits += '[' + str(int(vch+ych)) + ',' + str(int(hch+xch)) + ',' + str(subline) + ',' + str(subchar) + ',0,"' + char + '",' + str(charnum) + '], '
        amt += 1
    charnum += 1
    if amt%200 == 199:
        edits=edits[:-2]
        out='{"edits":' + edits + '], "kind":"write"}\n'
        print(out)
        edits="["
        amt=0
if amt > 0:
    edits=edits[:-2]
    out='{"edits":' + edits + '], "kind":"write"}\n'
    print(out)
    edits="["
    amt=0
