dim = open('dim.txt').readlines() + ['']
dim[4] = int(dim[3].split(' ')[1]) #y
dim[3] = int(dim[3].split(' ')[0]) #x

txt = open(dim[2][:-1]).readlines()

def split(qty, txt): #splits txt into groups of qty (counting \\ and \& as 1)
    splittxt = []
    while len(txt) > 0:
        charnum = qty
        totchar = qty-txt[:charnum].count('\\')+txt[:charnum].count('\\\\')
        while totchar != qty:
            totchar = qty-txt[:charnum].count('\\')+txt[:charnum].count('\\\\')
            charnum = totchar
            if totchar > len(txt):
                split.append(txt)
                txt = ''
                break
        splittxt.append(txt[:charnum])
        txt = txt[charnum:]

txt = [split(16*20, line) for line in txt]

try:
    print(txt[dim[4]*(8*20):(dim[4]+1)*(8*20)][dim[3]])
    dim[3] += 1
except:
    if dim[4]*(8*20) > len(txt):
        open('mode.txt').write('end')
    elif (dim[4]+1)*(8*20) > len(txt):
        try:
            print(txt[dim[4]*(8*20):][dim[3]])
            dim[3] += 1
        except:
            dim[4] += 1
            dim[3] = 0
    else:
        dim[4] += 1
        dim[3] = 0

#open('dim.txt','w').write(str(len(tuple(dim))))
open('dim.txt','w').write('{}{}{}{} {}'.format(dim[0],dim[1],dim[2],str(dim[3]),str(dim[4])))
