"""Logo reveal kit for CapCut.

Takes a single-colour "frame + wordmark" logo on a transparent background and
produces a ready-to-use CapCut kit:

  videos/  reveal on white, black, green screen, and a transparent .mov
  layers/  full-frame 1920x1080 PNGs (border + each letter) for rebuilding
           the animation with CapCut keyframes

Usage:
  python3 logo_reveal.py LOGO.png OUT_DIR [--duration 2] [--name farmec]
"""
import argparse, os, subprocess
import numpy as np
from PIL import Image

W, H, FPS = 1920, 1080, 30
LOGO_W = 1300


def load_logo(path):
    a = np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    alpha = a[..., 3] / 255
    if alpha.min() > 0.99:                      # opaque file: key out the white
        alpha = np.clip((255 - a[..., :3].min(-1)) / 200, 0, 1)
    ys, xs = np.where(alpha > 0.05)
    crop = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    rgb, alpha = a[crop][..., :3], alpha[crop]
    colour = np.median(rgb[alpha > 0.9], 0)
    s = LOGO_W / alpha.shape[1]
    size = (LOGO_W, int(round(alpha.shape[0] * s)))
    A = np.array(Image.fromarray((alpha * 255).astype(np.uint8)).resize(size, Image.LANCZOS)) / 255.0
    return A.astype(np.float32), colour.astype(np.float32)


def split(A):
    """Border = outer ring; letters = column runs inside it."""
    lh, lw = A.shape
    mid = A[lh // 2] > 0.5
    first = int(np.argmax(mid))                         # skip antialiased edge
    t = int(np.argmin(mid[first:])) + first if mid.any() else 0   # border thickness
    pad = int(t * 1.6) if t else 0
    inner = np.zeros_like(A, bool)
    inner[pad:lh - pad, pad:lw - pad] = True
    border = A * ~inner
    letters = A * inner
    cols = (letters > 0.3).any(0)
    runs, start = [], None
    for x, c in enumerate(np.append(cols, False)):
        if c and start is None: start = x
        if not c and start is not None: runs.append((start, x)); start = None
    parts = []
    for x0, x1 in runs:
        m = np.zeros_like(A); m[:, max(x0 - 4, 0):x1 + 4] = letters[:, max(x0 - 4, 0):x1 + 4]
        parts.append(m)
    return border, parts


def ease(t): t = np.clip(t, 0, 1); return 1 - (1 - t) ** 3
def eio(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def frames(A, colour, dur):
    lh, lw = A.shape
    border, letters = split(A)
    k = dur / 2.0                                     # timings authored for 2s
    yy, xx = np.mgrid[0:lh, 0:lw]
    ang = np.abs(np.arctan2((xx - lw / 2) / (lw / 2), -(yy - lh / 2) / (lh / 2))) / np.pi
    ox, oy = (W - lw) // 2, (H - lh) // 2
    stagger = 0.45 / max(len(letters), 1)
    for f in range(int(FPS * dur)):
        t = f / FPS / k
        # border draws from top centre, both ways
        lay = border * np.clip((ease(t / 0.6) * 1.1 - ang) * 25, 0, 1)
        # letters rise in one after another
        for i, m in enumerate(letters):
            lt = (t - 0.3 - i * stagger) / 0.3
            if lt <= 0: continue
            dy = int(round((1 - ease(lt)) * 0.18 * lh))
            lay = np.maximum(lay, np.roll(m, dy, 0) * eio(lt * 1.4))
        # soft sheen
        st = (t - 1.15) / 0.4
        sheen = np.zeros_like(A)
        if 0 < st < 1:
            d = xx + (yy - lh / 2) * 0.45 - (-200 + st * (lw + 400))
            sheen = np.exp(-(d / 55) ** 2) * 0.4
        rgb = colour + sheen[..., None] * (255 - colour)
        out = np.zeros((H, W, 4), np.float32)
        out[..., :3] = colour                            # avoids dark fringes when scaled
        out[oy:oy + lh, ox:ox + lw, :3] = rgb
        out[oy:oy + lh, ox:ox + lw, 3] = lay * 255
        img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
        sc = 1.0 + 0.04 * eio(t / 2.0)                   # slow push-in
        nw, nh = int(W * sc), int(H * sc)
        img = img.resize((nw, nh), Image.BICUBIC).crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))
        yield img


def encode(path, args):
    return subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba',
                             '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-'] + args + [path], stdin=subprocess.PIPE)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('logo'); p.add_argument('out')
    p.add_argument('--duration', type=float, default=2.0)
    p.add_argument('--name', default='logo')
    o = p.parse_args()
    A, colour = load_logo(o.logo)
    vid, lay = os.path.join(o.out, 'videos'), os.path.join(o.out, 'layers')
    os.makedirs(vid, exist_ok=True); os.makedirs(lay, exist_ok=True)
    mp4 = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', '-preset', 'slow', '-movflags', '+faststart']
    bgs = {'white': (255, 255, 255), 'black': (0, 0, 0), 'greenscreen': (0, 255, 0)}
    pipes = {k: encode(os.path.join(vid, f'{o.name}-reveal-{k}.mp4'), mp4) for k in bgs}
    pipes['alpha'] = encode(os.path.join(vid, f'{o.name}-reveal-transparent.mov'),
                            ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16'])
    for img in frames(A, colour, o.duration):
        pipes['alpha'].stdin.write(img.tobytes())
        for k, c in bgs.items():
            bg = Image.new('RGBA', (W, H), c + (255,))
            pipes[k].stdin.write(Image.alpha_composite(bg, img).tobytes())
    for pp in pipes.values():
        pp.stdin.close(); pp.wait()
    # full-frame layers, already in final position
    lh, lw = A.shape
    ox, oy = (W - lw) // 2, (H - lh) // 2
    border, letters = split(A)
    def save(m, name):
        out = np.zeros((H, W, 4), np.uint8)
        out[..., :3] = colour.astype(np.uint8)
        out[oy:oy + lh, ox:ox + lw, 3] = (m * 255).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(os.path.join(lay, name))
    save(A, '00-full-logo.png')
    save(border, '01-border.png')
    for i, m in enumerate(letters):
        save(m, f'{i + 2:02d}-letter-{i + 1}.png')


if __name__ == '__main__':
    main()
