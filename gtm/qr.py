"""Deterministic QR Model 2, version 4-L, byte mode, mask 0 (ISO layout).
Single RS block: 80 data + 20 parity codewords. At most 78 UTF-8 bytes.
"""

def multiply(a,b):
    result=0
    while b:
        if b&1: result ^= a
        b >>= 1
        a <<= 1
        if a&256: a ^= 0x11d
    return result

def qr_matrix(text):
    data=text.encode('utf-8')
    if len(data)>78: raise ValueError('Networking URL must be at most 78 UTF-8 bytes.')
    bits=[0,1,0,0]+[(len(data)>>i)&1 for i in range(7,-1,-1)]
    for b in data: bits += [(b>>i)&1 for i in range(7,-1,-1)]
    bits += [0]*min(4,640-len(bits))
    bits += [0]*((-len(bits))%8)
    words=[sum(bits[j+i]<<(7-i) for i in range(8)) for j in range(0,len(bits),8)]
    pads=(0xec,0x11)
    while len(words)<80: words.append(pads[(len(words)-((len(bits))//8))%2])
    generator=[1]
    power=1
    for _ in range(20):
        nxt=[0]*(len(generator)+1)
        for i,c in enumerate(generator):
            nxt[i]^=c
            nxt[i+1]^=multiply(c,power)
        generator=nxt
        power=multiply(power,2)
    remainder=words+[0]*20
    for i in range(80):
        scale=remainder[i]
        for j,g in enumerate(generator): remainder[i+j]^=multiply(g,scale)
    stream=[]
    for b in words+remainder[-20:]: stream += [(b>>i)&1 for i in range(7,-1,-1)]
    stream += [0]*7
    size=33
    grid=[[False]*size for _ in range(size)]
    fixed=[[False]*size for _ in range(size)]
    def put(x,y,v):
        if 0<=x<size and 0<=y<size: grid[y][x]=bool(v); fixed[y][x]=True
    for cx,cy in ((3,3),(29,3),(3,29)):
        for dy in range(-4,5):
            for dx in range(-4,5):
                dist=max(abs(dx),abs(dy))
                put(cx+dx,cy+dy,dist not in (2,4))
    for i in range(8,size-8): put(6,i,i%2==0); put(i,6,i%2==0)
    for dy in range(-2,3):
        for dx in range(-2,3): put(26+dx,26+dy,max(abs(dx),abs(dy))!=1)
    fmt=8 # L + mask zero = 01000
    rem=fmt
    for _ in range(10): rem=(rem<<1)^((rem>>9)*0x537)
    fmt=((fmt<<10)|rem)^0x5412
    for i in range(15):
        value=(fmt>>i)&1
        if i<6: put(8,i,value)
        elif i<8: put(8,i+1,value)
        elif i==8: put(7,8,value)
        else: put(14-i,8,value)
        if i<8: put(size-1-i,8,value)
        else: put(8,size-15+i,value)
    put(8,size-8,1)
    index=0
    right=size-1
    upwards=True
    while right>=1:
        if right==6: right=5
        for vert in range(size):
            y=size-1-vert if upwards else vert
            for x in (right,right-1):
                if not fixed[y][x]:
                    v=stream[index] if index<len(stream) else 0
                    grid[y][x]=bool(v^int((x+y)%2==0))
                    index+=1
        upwards=not upwards
        right-=2
    assert index==807
    return grid

def svg(text):
    grid=qr_matrix(text)
    path=' '.join(f'M{x+4},{y+4}h1v1h-1z' for y,row in enumerate(grid) for x,v in enumerate(row) if v)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41 41" role="img" aria-label="Networking link QR code"><rect width="41" height="41" fill="white"/><path d="{path}" fill="black"/></svg>'
