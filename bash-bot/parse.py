src = [line[:-1] for line in open('out.txt').readlines()] #Retrieves out.txt (server out)
import json #json syntax handler
src = [json.loads(cmd) for cmd in src] #initialises list of server responses
for cmd in src: #Sets cmd to fetch response
  if 'kind' in cmd.keys():
    if cmd['kind'] == 'fetch':
      src = cmd
      break

coords = [line.strip() for line in open('dim.txt').readlines()] #takes dim.txt dimensions
miny = int(coords[0]) #dimension
maxy = int(coords[2]) #dimension
minx = int(coords[1]) #dimension
maxx = int(coords[3]) #dimension

coords = [tuple([int(coord) for coord in coordstr.split(',')]) for coordstr in src['tiles'].keys()] #Changes coordinate keys from strings of form '0,0' to tuples of form (0,0)
src['tiles'] = dict(zip(coords, list(src['tiles'].values()))) #Inserts restructured coordinates into dictionary

lines = ['' for x in range(8*(maxy-miny+1))] #Initialises empty tileset

for line in range((maxy-miny+1)): #Iterates through lines
  for column in range(maxx-minx+1): #Iterates through columns
    tile = src['tiles'][(line+miny, column+minx)] #Finds tile from src
    for x in range(8): #Appends tile to lines list
      if type(tile) == type(None): #If tile is empty, appends empty tile
        lines[8*line+x] += " "*16
      else: #Traditional append structure (for a non-empty tile)
        lines[8*line+x] += tile['content'][16*x:16+16*x]
        tile['content'][16*x:16+16*x]

print(''.join(line+'\n' for line in lines)) #Prints full "snapshot" from fetch command (parses fetch output from server to a "snapshot" of that region)
