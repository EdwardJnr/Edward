import numpy as np, subprocess, sys
from PIL import Image, ImageFilter
W,H,FPS,DUR=1920,1080,30,3.0
N=int(FPS*DUR)
src=Image.open(sys.argv[1]).convert('RGBA')
a=np.array(src).astype(np.float32)
alpha=a[...,3]/255*np.clip((a[...,0]-a[...,1])/120,0,1)
alpha=alpha[224:556,248:1752]                     # crop to logo
S=1300/alpha.shape[1]
lw,lh=1300,int(round(alpha.shape[0]*S))
A=np.array(Image.fromarray((alpha*255).astype(np.uint8)).resize((lw,lh),Image.LANCZOS)).astype(np.float32)/255
ox,oy=(W-lw)//2,(H-lh)//2
RED=np.array([237,45,46],np.float32)
# split border vs letters (letter band in source coords → scaled)
yy,xx=np.mgrid[0:lh,0:lw]
inner=(xx>(300-248)*S)&(xx<(1700-248)*S)&(yy>(290-224)*S)&(yy<(490-224)*S)
border=A*(~inner); letters=A*inner
cols=[(334,526),(540,744),(756,964),(972,1268),(1280,1466),(1478,1664)]
L=[]
for x0,x1 in cols:
    m=np.zeros_like(A); s,e=int((x0-248-4)*S),int((x1-248+4)*S); m[:,s:e]=letters[:,s:e]; L.append(m)
ang=np.arctan2((xx-lw/2)/(lw/2),-(yy-lh/2)/(lh/2))   # 0 at top, ±pi at bottom
ang=np.abs(ang)/np.pi
def ease(t): t=np.clip(t,0,1); return 1-(1-t)**3
def eio(t): t=np.clip(t,0,1); return t*t*(3-2*t)
def shift(m,dx,dy):
    return np.roll(np.roll(m,int(round(dy)),0),int(round(dx)),1)
ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
  '-c:v','libx264','-pix_fmt','yuv420p','-crf','14','-preset','slow','-movflags','+faststart',sys.argv[2]],stdin=subprocess.PIPE)
for f in range(N):
    t=f/FPS
    # 1. border draws from top centre, both ways, 0.0–0.9s
    p=ease(t/0.9)*1.1
    bmask=border*np.clip((p-ang)*25,0,1)
    lay=bmask.copy()
    # 2. letters rise in, staggered, 0.45–1.65s
    glow=np.zeros_like(A)
    for i,m in enumerate(L):
        lt=(t-0.45-i*0.11)/0.45
        if lt<=0: continue
        e=ease(lt); dy=(1-e)*60*S
        lay=np.maximum(lay,shift(m,0,dy)*eio(lt*1.4))
    # 3. light sweep across the mark, 1.75–2.35s
    st=(t-1.75)/0.6
    sweep=np.zeros_like(A)
    if 0<st<1:
        cx=-200+st*(lw+400)
        d=(xx+ (yy-lh/2)*0.45)-cx
        sweep=np.exp(-(d/55)**2)*A*0.85
    # slow push-in over whole clip
    sc=1.0+0.04*eio(t/DUR)
    img=np.zeros((lh,lw,3),np.float32)
    img+=lay[...,None]*RED
    img+=sweep[...,None]*(255-RED)*lay[...,None]
    # soft red bloom
    bl=np.array(Image.fromarray((lay*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))).astype(np.float32)/255
    frame=np.zeros((H,W,3),np.float32)
    frame[oy:oy+lh,ox:ox+lw]=np.maximum(img, bl[...,None]*RED*0.22)
    # fade to and from black edges
    fr=Image.fromarray(np.clip(frame,0,255).astype(np.uint8))
    if sc!=1.0:
        nw,nh=int(W*sc),int(H*sc); fr=fr.resize((nw,nh),Image.BICUBIC).crop(((nw-W)//2,(nh-H)//2,(nw-W)//2+W,(nh-H)//2+H))
    ff.stdin.write(fr.tobytes())
ff.stdin.close(); ff.wait()
