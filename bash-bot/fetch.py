dim = [line[:-1] for line in open('dim.txt').readlines()]
mod = [line[:-1] for line in open('mode.txt').readlines()]
txt = open(dim[2]).readlines()

minX = str(int(dim[0]))
minY = str(int(dim[1]))
maxX = str(int(max([len(line[:-1])-line.count('\\')+line.count('\\\\') for line in txt])/16) + int(minX))
maxY = str(int(len(txt)/8) + int(minY))

if mod[0] == 'read':
    print(minX + '\n' + minY + '\n' + maxX + '\n' + maxY)
else:
    print('{"fetchRectangles":[{"minY":%s,"minX":%s,"maxY":%s,"maxX":%s}],"kind":"fetch","v":"3"}' % (minX, minY, maxX, maxY))
