"""music2.py out.wav D E transpose sfx_json
Original 120 BPM bed: pad + arp + drums from bar 2 to the end card, whooshes on cuts,
impact on the logo end card at E, plus reel-specific sound effects."""
import numpy as np, wave, sys, json
out, D, E, TR = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4])
SPEC = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
SR = 44100; N = int(SR * D)
L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(int(D * 10 + TR))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(sig, st, pan=0.0, g=1.0):
    i = int(st * SR); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    L[i:i+n] += sig[:n] * g * np.sqrt(.5 * (1 - pan)); R[i:i+n] += sig[:n] * g * np.sqrt(.5 * (1 + pan))
def lp(x, a):
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
CH = SPEC.get('chords', [[50,57,61,64,66],[47,54,57,61,62],[43,50,54,57,61],[45,52,57,59,64]])
CH = [[m + TR for m in c] for c in CH]
BAR = 2.0; drum_start = SPEC.get('drums_from', 2.0)
nb = int(np.ceil(E / BAR)) + 1
for b in range(nb):
    st = b * BAR
    if st >= E: break
    dur = min(BAR + 0.6, E - st + 0.8); n = int(dur * SR); tt = np.arange(n) / SR
    env = np.minimum(1, tt / 0.35) * np.minimum(1, (dur - tt) / 0.6)
    sig = sum(np.sin(2*np.pi*hz(m+d)*tt) + .3*np.sin(4*np.pi*hz(m+d)*tt) for m in CH[b % 4] for d in (-.08, .08))
    add(sig * env * .018 * (.55 if st < drum_start else 1), st, pan=.2 if b % 2 else -.2)
pat = [0,2,4,3,1,4,2,3]
for b in range(nb):
    if b * BAR < drum_start or b * BAR >= E: continue
    notes = [n + 12 for n in sorted(CH[b % 4])]
    for k in range(8):
        st = b * BAR + k * .25
        if st >= E - 0.05: break
        f = hz(notes[pat[k] % len(notes)] + (12 if k == 6 else 0)); n = int(.5 * SR); tt = np.arange(n) / SR
        sig = (np.sin(2*np.pi*f*tt) + .35*np.sin(4*np.pi*f*tt)*np.exp(-tt*30)) * np.exp(-tt*9) * np.minimum(1, tt/.003)
        add(sig * .09, st, pan=.45 if k % 2 else -.45)
def kick(g=1.):
    n = int(.45*SR); tt = np.arange(n)/SR; f = 45 + 110*np.exp(-tt*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*7) * g
def hat(g=1., dec=55):
    n = int(.12*SR); tt = np.arange(n)/SR; x = rng.standard_normal(n); x = x - lp(x, .35)
    return x * np.exp(-tt*dec) * g
def clap():
    n = int(.3*SR); tt = np.arange(n)/SR; x = rng.standard_normal(n); x = lp(x, .5) - lp(x, .08)
    return x * (np.exp(-tt*22) + .6*np.exp(-np.maximum(0, tt-.012)*30)*(tt > .012))
bt = drum_start
while bt < E - 0.3:
    beat = int(round(bt / .5)); add(kick(.55), bt); add(hat(.05), bt + .25, .3)
    if beat % 2 == 1: add(clap() * .12, bt, -.1)
    add(hat(.022, 90), bt + .125, -.3); add(hat(.022, 90), bt + .375, -.3); bt += .5
for b in range(nb):
    st0 = b * BAR
    if st0 < drum_start or st0 >= E: continue
    f = hz(CH[b % 4][0] - 12)
    for k in range(4):
        st = st0 + k*.5 + .25
        if st >= E - .3: break
        n = int(.24*SR); tt = np.arange(n)/SR
        add((np.sin(2*np.pi*f*tt) + .2*np.sin(4*np.pi*f*tt)) * np.minimum(1, tt/.01) * np.minimum(1, (.24-tt)/.04) * .16, st)
def whoosh(dur=.45, g=.08):
    n = int(dur*SR); tt = np.arange(n)/SR; x = rng.standard_normal(n); a = .02 + .25*(tt/dur)**2
    y = np.empty(n); s = 0
    for i in range(n): s += a[i]*(x[i]-s); y[i] = s
    return y * (tt/dur)**1.5 * g * 3
for c in SPEC.get('cuts', []): add(whoosh(), c - .45)
# intro bells
for k, (m, st) in enumerate([(74,.05),(78,.3),(81,.55)]):
    n = int(1.5*SR); tt = np.arange(n)/SR; f = hz(m+TR)
    add((np.sin(2*np.pi*f*tt) + .25*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6)) * np.exp(-tt*3) * np.minimum(1, tt/.004) * .08, st, [-.3,.3,0][k])
# sfx
def blip(f, dec=18, g=.08):
    n = int(.25*SR); tt = np.arange(n)/SR
    return (np.sin(2*np.pi*f*tt) + .3*np.sin(4*np.pi*f*tt)) * np.exp(-tt*dec) * np.minimum(1, tt/.002) * g
def click(g=.05):
    n = int(.04*SR); tt = np.arange(n)/SR; x = rng.standard_normal(n); x = x - lp(x, .5)
    return x * np.exp(-tt*160) * g
def scratch(dur=1.0, g=.04):
    n = int(dur*SR); tt = np.arange(n)/SR; x = rng.standard_normal(n); x = x - lp(x, .15)
    mod = .5 + .5*np.abs(np.sin(2*np.pi*3.2*tt + 3*np.sin(2*np.pi*.7*tt)))
    return x * mod * np.minimum(1, tt/.05) * np.minimum(1, (dur-tt)/.1) * g
def ping(g=.07):
    n = int(.6*SR); tt = np.arange(n)/SR
    return (np.sin(2*np.pi*1568*tt)*np.exp(-tt*9) + np.sin(2*np.pi*2093*np.maximum(0, tt-.07))*np.exp(-np.maximum(0, tt-.07)*9)*(tt > .07)) * g
def shutter(g=.12):
    return np.concatenate([click(g*2), np.zeros(int(.05*SR)), click(g*1.5)])
for ev in SPEC.get('sfx', []):
    kind, st = ev[0], ev[1]
    if kind == 'tick': add(blip(1760, 40, .05), st, .2)
    elif kind == 'chime': add(blip(hz(86+TR), 4, .07), st); add(blip(hz(93+TR), 4, .05), st + .08)
    elif kind == 'pop': add(blip(hz(79+TR) * 1.0, 22, .08), st)
    elif kind == 'key': add(click(.06), st, float(rng.uniform(-.3, .3)))
    elif kind == 'scratch': add(scratch(ev[2] if len(ev) > 2 else 1.0), st)
    elif kind == 'ping': add(ping(), st, float(rng.uniform(-.4, .4)))
    elif kind == 'shutter': add(shutter(), st)
    elif kind == 'drop': add(kick(.9), st); add(whoosh(.6, .1), st - .6)
    elif kind == 'riser': add(whoosh(ev[2], .12), st)
    elif kind == 'thud': add(kick(.5), st)
# end card impact + chord
add(whoosh(1.0, .12), E - 1.0)
n = int(1.6*SR); tt = np.arange(n)/SR; f = 40 + 60*np.exp(-tt*10)
add(np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt*2.8) * .7, E); add(kick(.6), E)
n = int((D - E + .5)*SR); tt = np.arange(n)/SR
add(sum((np.sin(2*np.pi*hz(m+TR)*tt) + .2*np.sin(4*np.pi*hz(m+TR)*tt)) for m in [62,69,73,76,78,81]) * np.exp(-tt*1.4) * .05 * np.minimum(1, tt/.01), E)
def rev(x, seed):
    r = np.random.default_rng(seed); n = int(1.6*SR); tt = np.arange(n)/SR
    ir = lp(r.standard_normal(n) * np.exp(-tt*3.2), .25); ir /= np.sqrt(np.sum(ir**2))
    return np.fft.irfft(np.fft.rfft(x, 2*N) * np.fft.rfft(ir, 2*N))[:N]
st = np.stack([L + .28*rev(L, 1), R + .28*rev(R, 2)], 1)
fade = np.ones(N); fo = int(.5*SR); fade[-fo:] = np.linspace(1, 0, fo)**1.5; fade[:int(.02*SR)] = np.linspace(0, 1, int(.02*SR))
st = np.tanh(st * fade[:, None] * 1.4) / np.tanh(1.4); st /= np.max(np.abs(st)) / .89
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()
