"""Katungo logo sting: 1080x1080, 3 seconds, 60 fps.

Usage: python3 render.py <logo.png|webp with alpha> <out_dir>
"""
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SIZE = 1080
FPS = 60
DUR = 3.0
FRAMES = int(FPS * DUR)
LOGO_PX = 800          # on-screen logo size at rest
MINT = np.array([47, 215, 154], dtype=np.float32) / 255.0   # #2FD79A
BG_IN = np.array([16, 58, 45], dtype=np.float32) / 255.0     # lifted Forest Teal
BG_OUT = np.array([3, 14, 10], dtype=np.float32) / 255.0     # near-black green


def clamp01(x):
    return np.clip(x, 0.0, 1.0)


def seg(t, a, b):
    return min(max((t - a) / (b - a), 0.0), 1.0)


def ease_out_expo(x):
    return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)


def ease_out_back(x, s=1.4):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def ease_in_out(x):
    return 0.5 - 0.5 * math.cos(math.pi * x)


def smoothstep(a, b, x):
    x = clamp01((x - a) / (b - a))
    return x * x * (3 - 2 * x)


# ---------- assets ----------
src = Image.open(sys.argv[1]).convert("RGBA")
out_dir = Path(sys.argv[2])
frames_dir = out_dir / "frames"
frames_dir.mkdir(parents=True, exist_ok=True)

W = src.width
arr = np.asarray(src).astype(np.float32) / 255.0
rgb, alpha = arr[..., :3], arr[..., 3]

# The mint asterisk is far redder than the dark tile, which separates it cleanly.
star = smoothstep(0.26, 0.40, rgb[..., 0]) * (alpha > 0.9)
star_img = Image.fromarray((star * 255).astype(np.uint8))
star_glow = np.asarray(star_img.filter(ImageFilter.GaussianBlur(28))).astype(np.float32) / 255
star_glow_wide = np.asarray(star_img.filter(ImageFilter.GaussianBlur(70))).astype(np.float32) / 255
tile = (alpha > 0.95).astype(np.float32)

yy, xx = np.mgrid[0:W, 0:W].astype(np.float32) / W
cx, cy = 0.50, 0.46   # centre of the asterisk in the source
rdist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)

# Background with vignette and a static grain plate.
fy, fx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE
fr = np.sqrt((fx - 0.5) ** 2 + (fy - 0.48) ** 2) / 0.72
bg_base = BG_IN[None, None] * (1 - clamp01(fr)[..., None]) ** 1.6 + BG_OUT[None, None] * (
    1 - (1 - clamp01(fr)[..., None]) ** 1.6
)
rng = np.random.default_rng(7)


def logo_layer(t):
    """Return (rgb, alpha) of the logo in source space at time t."""
    # Asterisk ignition: unlit engraving → radial light-up from the centre.
    ign = seg(t, 0.85, 1.55)
    radius = ease_out_expo(ign) * 0.75
    lit = smoothstep(radius - 0.08, radius, rdist)          # 1 = still unlit
    lit = 1 - lit if ign > 0 else np.zeros_like(rdist)
    dim = 0.38 + 0.62 * lit
    col = rgb * (1 - star[..., None] * (1 - dim[..., None]))

    # Hot flash at the ignition front, then settles.
    flash = math.sin(math.pi * seg(t, 0.85, 1.75)) * 0.55
    front = np.exp(-((rdist - radius) / 0.05) ** 2) * star * (ign > 0) * (1 - ign * 0.6)
    col = col + (MINT[None, None] * 0.6 + 0.4) * (front[..., None] * 0.9 + star[..., None] * flash * 0.25 * lit[..., None])

    # Specular sheen sweeping across the tile face.
    sw = seg(t, 1.55, 2.35)
    if 0 < sw < 1:
        pos = -0.4 + 1.8 * ease_in_out(sw)
        d = (xx * 0.8 + yy * 0.6) - pos
        band = np.exp(-(d / 0.07) ** 2) * 0.32 + np.exp(-(d / 0.22) ** 2) * 0.08
        col = col + band[..., None] * tile[..., None] * (0.75 + 0.25 * star[..., None])

    return clamp01(col), alpha


def glow_layer(t):
    """Additive mint glow in source space."""
    g = (
        0.9 * math.sin(math.pi * seg(t, 0.9, 2.0)) ** 1.5
        + 0.28 * smoothstep(1.3, 2.2, t)
    )
    return star_glow * g * 0.9 + star_glow_wide * g * 0.55


def place(img, t, resample=Image.BICUBIC):
    """Transform a source-space PIL image into frame space for time t."""
    p = ease_out_expo(seg(t, 0.05, 1.05))
    pb = ease_out_back(seg(t, 0.05, 1.05), 1.2)
    scale = (0.78 + 0.22 * pb) * (1 + 0.025 * ease_in_out(seg(t, 1.0, 3.0)))
    rot = -9 * (1 - p)
    dy = 70 * (1 - p)
    s = LOGO_PX * scale
    im = img.resize((max(1, int(s)), max(1, int(s))), resample)
    if abs(rot) > 0.01:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    canvas = Image.new(img.mode, (SIZE, SIZE), 0 if img.mode == "L" else (0, 0, 0, 0))
    ox = (SIZE - im.width) // 2
    oy = (SIZE - im.height) // 2 + int(dy) - 10
    canvas.paste(im, (ox, oy))
    return canvas, p


for i in range(FRAMES):
    t = i / FPS

    # Background breathes up from black.
    bg_on = ease_out_expo(seg(t, 0.0, 0.9))
    frame = bg_base * (0.35 + 0.65 * bg_on)

    # Back-light bloom behind the tile.
    bloom = (0.10 * ease_out_expo(seg(t, 0.2, 1.2)) + 0.12 * math.sin(math.pi * seg(t, 0.9, 2.2)))
    frame = frame + MINT[None, None] * bloom * np.exp(-(fr / 0.55) ** 2)[..., None]

    col, al = logo_layer(t)
    rgba = Image.fromarray(np.dstack([col, al]).clip(0, 1).__mul__(255).astype(np.uint8), "RGBA")
    placed, p = place(rgba, t)

    # Entrance blur that resolves as the tile lands.
    blur = 10 * (1 - p) ** 2
    if blur > 0.3:
        placed = placed.filter(ImageFilter.GaussianBlur(blur))

    pa = np.asarray(placed).astype(np.float32) / 255
    fade = smoothstep(0.0, 0.35, t)
    a = pa[..., 3:4] * fade
    frame = frame * (1 - a) + pa[..., :3] * a

    gl, _ = place(Image.fromarray((clamp01(glow_layer(t)) * 255).astype(np.uint8), "L"), t)
    gl = np.asarray(gl).astype(np.float32)[..., None] / 255
    frame = 1 - (1 - frame) * (1 - MINT[None, None] * gl * fade)     # screen blend

    grain = rng.normal(0, 0.012, (SIZE, SIZE, 1)).astype(np.float32)
    frame = clamp01(frame + grain)
    Image.fromarray((frame * 255 + 0.5).astype(np.uint8)).save(frames_dir / f"f{i:04d}.png")
    if i % 30 == 0:
        print(f"frame {i}/{FRAMES}", flush=True)

mp4 = out_dir / "katungo-logo-sting-1080x1080.mp4"
subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames_dir / "f%04d.png"),
     "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
     "-movflags", "+faststart", str(mp4)],
    check=True,
)
print("wrote", mp4)
