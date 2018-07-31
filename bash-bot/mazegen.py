#Maze generator - Minecraft (#'s are blocks & spaces are empty)
from random import *

dimensionx = 100
dimensiony = 100

maze = open('maze.txt', mode='w')
horiz = []
for x in range(dimensionx*2-1):
    horiz.append('#')
vert = []
for x in range(dimensiony*2-1):
    vert.append(horiz[:])
vert[0][0] = ' '
explored = [[0,0]]
frontier = [[0,1],[1,0]]

while len(frontier) > 0:
    newexp = frontier[randint(0,len(frontier)-1)]
    isfrontier = []
    if not newexp[0] == 0:
        isfrontier.append([newexp[0]-1,newexp[1]])
    if not newexp[1] == 0:
        isfrontier.append([newexp[0],newexp[1]-1])
    if not newexp[0] == dimensionx-1:
        isfrontier.append([newexp[0]+1,newexp[1]])
    if not newexp[1] == dimensiony-1:
        isfrontier.append([newexp[0],newexp[1]+1])
    possiblelink = []
    for cell in isfrontier:
        if not (cell in explored or cell in frontier):
            frontier.append(cell)
        if cell in explored:
            possiblelink.append(cell)
    link = [possiblelink[randint(0,len(possiblelink)-1)],newexp]
    explored.append(newexp)
    frontier.remove(newexp)
    vert[link[1][0]*2][link[1][1]*2] = ' '
    vert[link[0][0]+link[1][0]][link[0][1]+link[1][1]] = ' '

double = True
if double:
    maze.write('#'*((dimensionx*2+1)*2) + '\n')
    for line in vert:
        newline = ''
        for char in line:
            newline += char*2
        maze.write('##' + newline + '##\n')
    maze.write('#'*((dimensionx*2+1)*2))
else:
    maze.write('#'*(dimensionx*2+1) + '\n')
    for line in vert:
        newline = ''
        for char in line:
            newline += char
        maze.write('#' + newline + '#\n')
    maze.write('#'*(dimensionx*2+1) + '\n')
maze.close()
