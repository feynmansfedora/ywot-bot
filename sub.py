dim = [line[:-1] for line in open('dim.txt').readlines()]
top = [line[:-1] for line in open(dim[3]).readlines()]
low = [line[:-1] for line in open(dim[0]).readlines()]
trans = False
if dim[6] == 'tru':
	trans = True
def splitline(line):
	chunks = []
	chunk = []
	esc = False
	leng = 0
	for char in line:
		if leng == 16:
			leng = 0
			chunks.append(chunk)
			chunk = []
		if esc:
			chunk.append('\\' + char)
			esc = False
			leng += 1
		elif char == '\\':
			esc = True
		else:
			chunk.append(char)
			leng += 1
	if len(chunk) > 0:
		chunks.append(chunk + ['\*']*(16-len(chunk)))
	return chunks

def fetch(txt, minx0, miny0, txtminx, txtminy, locx, locy): #txt is an array of lines; returns a 16x8 chunk
	ind = 8*(locy-txtminy)
	if ind >= 0 and locx-txtminx >= 0:
		try:
			rows = txt[ind:8+ind]
			rows = [splitline(row) for row in rows]
			rows = [row[locx-txtminx] for row in rows]
			return rows + [['\\*']*16 for x in range(8-len(rows))]
		except:
			return [['\\*' for x in range(16)] for x in range(8)]
	else:
		return [['\\*' for x in range(16)] for x in range(8)]

def subchar(char1, char2):
	if trans:
		if char2 == char1:
			return '&'
		elif char1 == '&' or char1 == '\\*':
			return '&'
		else:
			return char2
	else:
		if char2 == char1:
			return '&'
		elif char1 == '&' or char1 == '\\*':
			return char2
		else:
			return char2

def sub(ch1, ch2): #subtracts 2 chunks (ch2 is top)
	ch3 = [['' for x in range(16)] for x in range(8)]
	for linen in range(8):
		for charn in range(16):
			a = ch1[linen][charn]
			b = ch2[linen][charn]
			ch3[linen][charn] = subchar(ch1[linen][charn],ch2[linen][charn])
	return ch3

minx = min(int(dim[1]), int(dim[4]))
maxx = minx + int(max(max([len(line) - low.count('\\') for line in low]), max([len(line) - low.count('\\') for line in top]))/16)
miny = min(int(dim[2]), int(dim[5]))
maxy = miny + int(max(len(low), len(top))/8)

finmin = [['']*8 for x in range(maxy-miny)]

for x in range(maxx-minx):
	x += minx
	for y in range(maxy-miny):
		y += miny
		topch = fetch(top, minx, miny, int(dim[4]), int(dim[5]), x, y)
		lowch = fetch(low, minx, miny, int(dim[1]), int(dim[2]), x, y)
		min0 = sub(lowch, topch)
		finmin[y-miny] = [finmin[y-miny][z]+''.join(min0[z]) for z in range(8)]

print(''.join([''.join([minc.replace('\\*','&').rstrip('&')+'\n' for minc in minr]) for minr in finmin]))
