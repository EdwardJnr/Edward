"""Builds the Katungo identity mockup suite as layered PSDs plus PNG previews.

Every PSD keeps the logo on its own layers inside a group called
"REPLACE LOGO", so a new mark can be dropped in without touching the scene.

Run:  python3 build_mockups.py
"""
import os
import random

import numpy as np

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from psd_tools import PSDImage
from psd_tools.api.layers import Group, PixelLayer
from psd_tools.constants import Compression

W, H = 2400, 1600
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PSD = os.path.join(HERE, "psd")
OUT_PNG = os.path.join(HERE, "previews")
OUT_LOGO = os.path.join(HERE, "logo")

TEAL = (15, 76, 58)
TEAL_DEEP = (9, 52, 40)
MINT = (47, 215, 154)
PAPER = (247, 245, 240)
INK = (24, 28, 26)
STONE = (233, 230, 223)

FONT_DIR = "/usr/share/fonts"
SERIF = f"{FONT_DIR}/truetype/crosextra/Caladea-Regular.ttf"
SERIF_BOLD = f"{FONT_DIR}/truetype/crosextra/Caladea-Bold.ttf"
SANS = f"{FONT_DIR}/opentype/inter/Inter-Regular.otf"
SANS_MED = f"{FONT_DIR}/opentype/inter/Inter-Medium.otf"
SANS_BOLD = f"{FONT_DIR}/opentype/inter/Inter-SemiBold.otf"

random.seed(7)


# ---------------------------------------------------------------- helpers

def font(path, size):
    return ImageFont.truetype(path, size)


def blank():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def textured(colour, amount=6, size=(W, H)):
    """Flat colour with fine grain, so surfaces read as paper, card or stone."""
    base = Image.new("RGB", size, colour)
    noise = Image.effect_noise(size, 40).convert("L")
    grain = Image.merge("RGB", [noise] * 3)
    out = Image.blend(base, grain, amount / 100)
    # Re-tint towards the intended colour so grain does not grey it out.
    return Image.blend(out, base, 0.55).convert("RGBA")


def rect_mask(box, radius=0):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


def fill_shape(mask, colour, grain=5):
    layer = blank()
    layer.paste(textured(colour, grain), (0, 0), mask)
    return layer


def shadow(mask, offset=(0, 18), blur=28, opacity=0.32):
    """Soft contact shadow from a shape mask."""
    m = Image.new("L", (W, H), 0)
    m.paste(mask, offset)
    m = m.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * opacity))
    layer = Image.new("RGBA", (W, H), (10, 18, 14, 0))
    layer.putalpha(m)
    return layer


def lighting(strength=60, direction="tl"):
    """Diagonal light fall-off laid over the whole scene."""
    # Smooth diagonal ramp: clear at top left, darkest at bottom right.
    xs = np.linspace(0, 1, W)[None, :]
    ys = np.linspace(0, 1, H)[:, None]
    ramp = np.clip((xs * 0.55 + ys * 0.45) ** 1.6, 0, 1)
    alpha = Image.fromarray((ramp * strength).astype("uint8"), "L")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(alpha)
    return layer


def text_layer(items):
    """items: list of (xy, text, font, fill, anchor)."""
    layer = blank()
    d = ImageDraw.Draw(layer)
    for xy, txt, f, fill, anchor in items:
        d.text(xy, txt, font=f, fill=fill, anchor=anchor)
    return layer


def tracked(draw, xy, txt, f, fill, tracking):
    x, y = xy
    for ch in txt:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking


# ------------------------------------------------------------------- logo

def wordmark(colour, height):
    """Placeholder serif wordmark. Height is the cap height in pixels."""
    size = int(height * 1.45)
    f = font(SERIF, size)
    tmp = Image.new("RGBA", (size * 8, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    tracking = size * 0.01
    x = 0
    for ch in "Katungo":
        d.text((x, size * 0.3), ch, font=f, fill=colour)
        x += d.textlength(ch, font=f) + tracking
    # Mint full stop: a small signature without changing the name.
    r = size * 0.075
    cy = size * 0.3 + f.getbbox("K")[3] - r
    d.ellipse((x + r * 0.3, cy - r, x + r * 2.3, cy + r), fill=MINT + (255,))
    return tmp.crop(tmp.getbbox())


def monogram(fg, bg, diameter):
    img = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, diameter - 1, diameter - 1), fill=bg)
    f = font(SERIF, int(diameter * 0.62))
    d.text((diameter / 2, diameter / 2 + diameter * 0.03), "K", font=f, fill=fg, anchor="mm")
    return img


def place(img, centre=None, topleft=None):
    layer = blank()
    if centre:
        x = int(centre[0] - img.width / 2)
        y = int(centre[1] - img.height / 2)
    else:
        x, y = topleft
    layer.alpha_composite(img, (x, y))
    return layer


# ------------------------------------------------------------------ write

def save(name, title, stack):
    """stack: list of (group, layer_name, RGBA full-canvas image), bottom first."""
    psd = PSDImage.new("RGB", (W, H), color=STONE)
    groups = {}
    preview = Image.new("RGBA", (W, H), STONE + (255,))
    for group, lname, img in stack:
        preview.alpha_composite(img)
        bbox = img.getbbox()
        if not bbox:
            continue
        if group not in groups:
            groups[group] = Group.new(psd, group)
        PixelLayer.frompil(img.crop(bbox), groups[group], lname, top=bbox[1], left=bbox[0],
                          compression=Compression.ZIP)
    psd.save(os.path.join(OUT_PSD, f"{name}.psd"))
    preview.convert("RGB").save(os.path.join(OUT_PNG, f"{name}.jpg"), quality=88)
    print("built", name, "-", title)


LOGO = "REPLACE LOGO"
TIP = " (right-click > Convert to Smart Object)"


# --------------------------------------------------------------- mockups

def m01_cover():
    bg = textured(TEAL, 4)
    vign = lighting(90)
    mark = wordmark(PAPER + (255,), 150)
    meta = text_layer([
        ((160, H - 150), "Brand Identity  —  2026", font(SANS, 30), PAPER + (200,), "ls"),
        ((W - 160, H - 150), "Harare  →  Lagos  →  London", font(SANS, 30), PAPER + (200,), "rs"),
        ((160, 170), "Photography & Cinematography  ·  Graphic Design & Branding  ·  Intelligent Advisory",
         font(SANS, 26), MINT + (230,), "ls"),
    ])
    save("01-cover", "Identity cover", [
        ("Background", "Forest Teal field", bg),
        ("Background", "Light fall-off", vign),
        ("Type", "Captions", meta),
        (LOGO, "Logo — cover" + TIP, place(mark, (W / 2, H / 2))),
    ])


def m02_business_cards():
    bg = textured(STONE, 6)
    cw, ch = 1050, 600  # 85 x 55 mm proportion at scale
    front = (230, 330, 230 + cw, 330 + ch)
    back = (1120, 640, 1120 + cw, 640 + ch)
    fm, bm = rect_mask(front, 14), rect_mask(back, 14)
    back_text = text_layer([
        ((back[0] + 80, back[1] + 330), "Edward", font(SANS_BOLD, 40), INK + (255,), "ls"),
        ((back[0] + 80, back[1] + 380), "Founder", font(SANS, 30), INK + (170,), "ls"),
        ((back[0] + 80, back[3] - 120), "hello@katungo.studio", font(SANS, 28), INK + (220,), "ls"),
        ((back[0] + 80, back[3] - 75), "Harare, Zimbabwe", font(SANS, 28), INK + (220,), "ls"),
        ((back[2] - 80, back[3] - 75), "katungo.studio", font(SANS_MED, 28), TEAL + (255,), "rs"),
    ])
    rule = blank()
    ImageDraw.Draw(rule).rectangle((back[0] + 80, back[1] + 430, back[0] + 160, back[1] + 434), fill=MINT)
    save("02-business-cards", "Business cards", [
        ("Background", "Stone surface", bg),
        ("Shadows", "Card shadow — front", shadow(fm)),
        ("Shadows", "Card shadow — back", shadow(bm)),
        ("Objects", "Card front — Forest Teal", fill_shape(fm, TEAL, 4)),
        ("Objects", "Card back — paper", fill_shape(bm, PAPER, 5)),
        ("Type", "Card details", back_text),
        ("Type", "Mint rule", rule),
        (LOGO, "Logo — card front" + TIP,
         place(wordmark(PAPER + (255,), 70), ((front[0] + front[2]) / 2, (front[1] + front[3]) / 2))),
        (LOGO, "Logo — card back" + TIP,
         place(wordmark(TEAL + (255,), 42), topleft=(back[0] + 80, back[1] + 80))),
        ("Lighting", "Light fall-off", lighting(55)),
    ])


def m03_stationery():
    bg = textured((222, 226, 220), 6)
    a4 = (260, 150, 260 + 1000, 150 + 1414)
    env = (1360, 240, 1360 + 900, 240 + 450)  # DL
    slip = (1360, 820, 1360 + 900, 820 + 450)
    m_a4, m_env, m_slip = rect_mask(a4), rect_mask(env, 4), rect_mask(slip, 4)
    flap = blank()
    ImageDraw.Draw(flap).polygon(
        [(env[0], env[1]), (env[2], env[1]), ((env[0] + env[2]) / 2, env[1] + 190)], fill=(0, 0, 0, 22))
    body = blank()
    d = ImageDraw.Draw(body)
    f_body = font(SANS, 19)
    y = a4[1] + 420
    d.text((a4[0] + 90, y - 80), "8 October 2026", font=f_body, fill=INK + (200,))
    for i in range(14):
        width = 820 if i % 5 != 4 else 520
        d.rectangle((a4[0] + 90, y, a4[0] + 90 + width, y + 6), fill=(60, 66, 62, 60))
        y += 34 if i % 5 != 4 else 70
    foot = text_layer([
        ((a4[0] + 90, a4[3] - 80), "Katungo  ·  Harare, Zimbabwe  ·  katungo.studio", font(SANS, 18), INK + (170,), "ls"),
        ((env[0] + 470, env[1] + 260), "Story-to-Scale", font(SANS_MED, 20), TEAL + (220,), "ls"),
        ((slip[0] + 60, slip[3] - 60), "With compliments", font(SERIF, 34), INK + (230,), "ls"),
    ])
    band = blank()
    ImageDraw.Draw(band).rectangle((a4[0], a4[3] - 14, a4[2], a4[3]), fill=TEAL)
    ImageDraw.Draw(band).rectangle((slip[2] - 120, slip[1], slip[2], slip[3]), fill=TEAL)
    save("03-stationery", "Letterhead, envelope and compliment slip", [
        ("Background", "Surface", bg),
        ("Shadows", "Shadow — letterhead", shadow(m_a4, (0, 14), 24, 0.28)),
        ("Shadows", "Shadow — envelope", shadow(m_env, (0, 12), 22, 0.28)),
        ("Shadows", "Shadow — slip", shadow(m_slip, (0, 12), 22, 0.28)),
        ("Objects", "Letterhead A4", fill_shape(m_a4, PAPER)),
        ("Objects", "Envelope DL", fill_shape(m_env, (243, 240, 232))),
        ("Objects", "Envelope flap", flap),
        ("Objects", "Compliment slip", fill_shape(m_slip, PAPER)),
        ("Objects", "Teal bands", band),
        ("Type", "Letter body and footers", Image.alpha_composite(body, foot)),
        (LOGO, "Logo — letterhead" + TIP, place(wordmark(TEAL + (255,), 46), topleft=(a4[0] + 90, a4[1] + 110))),
        (LOGO, "Logo — envelope" + TIP, place(wordmark(TEAL + (255,), 34), topleft=(env[0] + 60, env[1] + 60))),
        (LOGO, "Logo — slip" + TIP, place(wordmark(TEAL + (255,), 34), topleft=(slip[0] + 60, slip[1] + 60))),
        ("Lighting", "Light fall-off", lighting(45)),
    ])


def m04_tote():
    bg = textured((214, 220, 214), 5)
    body = (700, 560, 1700, 1500)
    m_body = rect_mask(body, 6)
    handles = blank()
    d = ImageDraw.Draw(handles)
    for x0 in (860, 1360):
        d.arc((x0, 120, x0 + 180, 1000), 180, 360, fill=(208, 196, 170, 255), width=46)
    hshadow = Image.new("L", (W, H), 0)
    hshadow.paste(handles.getchannel("A"))
    seam = blank()
    ImageDraw.Draw(seam).line((body[0] + 30, body[1] + 60, body[2] - 30, body[1] + 60), fill=(150, 138, 110, 120), width=3)
    folds = blank()
    fd = ImageDraw.Draw(folds)
    for x in (900, 1180, 1500):
        fd.line((x, body[1] + 80, x + 40, body[3] - 40), fill=(0, 0, 0, 14), width=40)
    folds = folds.filter(ImageFilter.GaussianBlur(30))
    strap = text_layer([((1200, 1330), "Your story, at scale.", font(SERIF, 44), TEAL + (255,), "mm")])
    save("04-tote-bag", "Canvas tote", [
        ("Background", "Wall", bg),
        ("Shadows", "Shadow — bag", shadow(m_body, (0, 24), 34, 0.30)),
        ("Shadows", "Shadow — handles", shadow(hshadow, (0, 10), 14, 0.20)),
        ("Objects", "Handles", handles),
        ("Objects", "Bag — natural canvas", fill_shape(m_body, (226, 214, 188), 9)),
        ("Objects", "Top seam", seam),
        ("Type", "Line", strap),
        (LOGO, "Logo — tote print" + TIP, place(wordmark(TEAL + (255,), 110), (1200, 1000))),
        ("Lighting", "Fabric folds", folds),
        ("Lighting", "Light fall-off", lighting(50)),
    ])


def m05_crew_pass():
    bg = textured(STONE, 6)
    card = (870, 520, 870 + 660, 520 + 980)
    m_card = rect_mask(card, 26)
    lanyard = blank()
    d = ImageDraw.Draw(lanyard)
    d.polygon([(1080, 0), (1150, 0), (1185, 470), (1145, 470)], fill=TEAL + (255,))
    d.polygon([(1320, 0), (1250, 0), (1215, 470), (1255, 470)], fill=TEAL + (255,))
    d.rounded_rectangle((1150, 440, 1250, 540), radius=14, fill=(180, 184, 182, 255))
    d.rounded_rectangle((1170, 470, 1230, 500), radius=10, fill=(120, 124, 122, 255))
    top = blank()
    ImageDraw.Draw(top).rounded_rectangle((card[0], card[1], card[2], card[1] + 420), radius=26, fill=TEAL + (255,))
    ImageDraw.Draw(top).rectangle((card[0], card[1] + 380, card[2], card[1] + 420), fill=TEAL + (255,))
    ImageDraw.Draw(top).rounded_rectangle((1150, card[1] + 40, 1250, card[1] + 64), radius=12, fill=STONE + (255,))
    info = text_layer([
        ((card[0] + 60, card[1] + 520), "CREW", font(SANS_BOLD, 96), TEAL + (255,), "ls"),
        ((card[0] + 60, card[1] + 590), "Production pass", font(SANS, 30), INK + (180,), "ls"),
        ((card[0] + 60, card[1] + 720), "Photography & Cinematography", font(SANS_MED, 26), INK + (230,), "ls"),
        ((card[0] + 60, card[1] + 760), "Harare  ·  On location", font(SANS, 26), INK + (170,), "ls"),
        ((card[0] + 60, card[3] - 60), "katungo.studio", font(SANS_MED, 24), TEAL + (255,), "ls"),
    ])
    stripe = blank()
    ImageDraw.Draw(stripe).rectangle((card[2] - 110, card[3] - 120, card[2] - 60, card[3] - 60), fill=MINT)
    save("05-crew-pass", "Crew lanyard pass", [
        ("Background", "Surface", bg),
        ("Shadows", "Shadow — pass", shadow(m_card, (0, 22), 30, 0.30)),
        ("Objects", "Lanyard and clip", lanyard),
        ("Objects", "Pass — white card", fill_shape(m_card, PAPER)),
        ("Objects", "Pass — teal header", top),
        ("Objects", "Mint marker", stripe),
        ("Type", "Pass details", info),
        (LOGO, "Logo — pass header" + TIP, place(wordmark(PAPER + (255,), 64), (1200, card[1] + 240))),
        ("Lighting", "Light fall-off", lighting(50)),
    ])


def m06_studio_sign():
    wall = textured((224, 219, 208), 10)
    brick = blank()
    d = ImageDraw.Draw(brick)
    for row, y in enumerate(range(0, H, 70)):
        off = 0 if row % 2 else 110
        for x in range(-off, W, 220):
            d.rectangle((x, y, x + 214, y + 64), outline=(0, 0, 0, 16), width=3)
    fascia = (300, 260, 2100, 620)
    m_f = rect_mask(fascia, 4)
    door = (1500, 760, 1960, H)
    window = (380, 760, 1380, 1460)
    glass = blank()
    gd = ImageDraw.Draw(glass)
    gd.rectangle(window, fill=(30, 46, 42, 255))
    gd.rectangle(door, fill=(30, 46, 42, 255))
    gd.rectangle(window, outline=(20, 22, 22, 255), width=18)
    gd.rectangle(door, outline=(20, 22, 22, 255), width=18)
    glare = blank()
    ImageDraw.Draw(glare).polygon([(window[0] + 520, window[3] - 20), (window[0] + 760, window[1] + 20),
                                   (window[0] + 860, window[1] + 20), (window[0] + 620, window[3] - 20)],
                                  fill=(255, 255, 255, 16))
    vinyl = text_layer([
        ((window[0] + 70, window[3] - 150), "Photography & Cinematography", font(SANS, 30), PAPER + (230,), "ls"),
        ((window[0] + 70, window[3] - 105), "Graphic Design & Branding", font(SANS, 30), PAPER + (230,), "ls"),
        ((window[0] + 70, window[3] - 60), "Intelligent Advisory", font(SANS, 30), PAPER + (230,), "ls"),
        ((door[0] + 60, door[1] + 120), "Studio", font(SERIF, 54), PAPER + (240,), "ls"),
        ((door[0] + 60, door[1] + 175), "Mon – Fri  ·  08:30 – 17:30", font(SANS, 24), PAPER + (200,), "ls"),
    ])
    save("06-studio-signage", "Studio fascia and window vinyl", [
        ("Background", "Rendered wall", wall),
        ("Background", "Brick coursing", brick),
        ("Shadows", "Shadow — fascia", shadow(m_f, (0, 30), 36, 0.35)),
        ("Objects", "Fascia — Forest Teal", fill_shape(m_f, TEAL, 4)),
        ("Objects", "Window and door glazing", glass),
        ("Objects", "Glass reflection", glare),
        ("Type", "Window vinyl", vinyl),
        (LOGO, "Logo — fascia" + TIP, place(wordmark(PAPER + (255,), 150), (1200, 440))),
        (LOGO, "Logo — window monogram" + TIP, place(monogram(TEAL + (255,), MINT + (255,), 180), (window[2] - 170, window[1] + 170))),
        ("Lighting", "Light fall-off", lighting(70)),
    ])


def m07_poster():
    wall = textured((40, 44, 42), 8)
    frame = (650, 120, 1750, 1500)
    inner = (frame[0] + 30, frame[1] + 30, frame[2] - 30, frame[3] - 30)
    m_frame, m_inner = rect_mask(frame), rect_mask(inner)
    poster = fill_shape(m_inner, TEAL, 5)
    art = blank()
    d = ImageDraw.Draw(art)
    cx, cy = (inner[0] + inner[2]) / 2, inner[1] + 560
    for i, r in enumerate(range(380, 40, -60)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=MINT + (255 - i * 30,), width=4)
    d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=MINT + (255,))
    copy = text_layer([
        ((inner[0] + 80, inner[3] - 330), "From Harare,", font(SERIF, 84), PAPER + (255,), "ls"),
        ((inner[0] + 80, inner[3] - 235), "to everywhere.", font(SERIF, 84), PAPER + (255,), "ls"),
        ((inner[0] + 80, inner[3] - 90), "Story-to-Scale  ·  katungo.studio", font(SANS, 26), PAPER + (190,), "ls"),
    ])
    save("07-poster", "Framed poster", [
        ("Background", "Dark wall", wall),
        ("Shadows", "Shadow — frame", shadow(m_frame, (0, 30), 40, 0.6)),
        ("Objects", "Frame", fill_shape(m_frame, (18, 18, 18), 3)),
        ("Objects", "Poster stock", poster),
        ("Objects", "Rings artwork", art),
        ("Type", "Headline", copy),
        (LOGO, "Logo — poster" + TIP, place(wordmark(PAPER + (255,), 52), topleft=(inner[0] + 80, inner[1] + 80))),
        ("Lighting", "Glass sheen", lighting(40)),
    ])


def phone(x, y, w=620, h=1280):
    body = (x, y, x + w, y + h)
    screen = (x + 26, y + 26, x + w - 26, y + h - 26)
    return body, screen


def m08_social():
    bg = textured(STONE, 6)
    body, screen = phone(890, 160)
    m_body = rect_mask(body, 90)
    device = fill_shape(m_body, (22, 24, 24), 2)
    ImageDraw.Draw(device).rounded_rectangle(screen, radius=68, fill=(250, 250, 248, 255))
    ui = blank()
    d = ImageDraw.Draw(ui)
    sx, sy = screen[0], screen[1]
    d.rounded_rectangle((sx + 230, sy + 22, sx + 340, sy + 56), radius=17, fill=(22, 24, 24, 255))
    d.text((sx + 40, sy + 120), "katungo.studio", font=font(SANS_BOLD, 30), fill=INK)
    d.text((sx + 200, sy + 230), "Media and design studio, Harare.", font=font(SANS, 22), fill=INK + (200,))
    d.text((sx + 200, sy + 262), "Story-to-Scale.", font=font(SANS, 22), fill=INK + (200,))
    tiles = []
    gx, gy, gw = sx, sy + 360, (screen[2] - screen[0] - 8) // 3
    palette = [TEAL, PAPER, MINT, (196, 206, 198), TEAL_DEEP, TEAL, PAPER, MINT, TEAL_DEEP]
    for i, col in enumerate(palette):
        r, c = divmod(i, 3)
        box = (gx + c * (gw + 4), gy + r * (gw + 4), gx + c * (gw + 4) + gw, gy + r * (gw + 4) + gw)
        d.rectangle(box, fill=col + (255,))
        if col == PAPER:
            d.rectangle(box, outline=(220, 220, 214, 255), width=2)
        tiles.append((box, col))
    words = ["Real moments.", None, "Clarity Sprint", None, None, None, "Find the right customers.", None, "Build the system."]
    for (box, col), w in zip(tiles, words):
        if w:
            fg = INK if col in (PAPER, MINT) else PAPER
            d.text((box[0] + 16, box[3] - 20), w, font=font(SERIF, 20), fill=fg, anchor="ls")
    # Logo placements: avatar plus the brand tiles.
    logos = blank()
    logos.alpha_composite(monogram(PAPER + (255,), TEAL + (255,), 130), (sx + 40, sy + 200))
    for (box, col) in (tiles[1], tiles[4], tiles[7]):
        fg = TEAL if col == PAPER else PAPER
        mk = wordmark(fg + (255,), 22)
        logos.alpha_composite(mk, (int((box[0] + box[2] - mk.width) / 2), int((box[1] + box[3] - mk.height) / 2)))
    save("08-social-profile", "Instagram profile on phone", [
        ("Background", "Surface", bg),
        ("Shadows", "Shadow — phone", shadow(m_body, (0, 30), 40, 0.35)),
        ("Objects", "Phone", device),
        ("Objects", "Profile interface", ui),
        (LOGO, "Logo — avatar and tiles" + TIP, logos),
        ("Lighting", "Light fall-off", lighting(45)),
    ])


def m09_laptop():
    bg = textured((226, 228, 224), 5)
    lid = (520, 180, 1880, 1040)
    screen = (560, 220, 1840, 1000)
    base = [(380, 1060), (2020, 1060), (2100, 1130), (300, 1130)]
    m_lid = rect_mask(lid, 30)
    dev = fill_shape(m_lid, (30, 32, 32), 2)
    d = ImageDraw.Draw(dev)
    d.rectangle(screen, fill=TEAL + (255,))
    d.polygon(base, fill=(196, 198, 198, 255))
    d.rectangle((1100, 1060, 1300, 1074), fill=(170, 172, 172, 255))
    base_mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(base_mask).polygon(base, fill=255)
    site = blank()
    s = ImageDraw.Draw(site)
    s.text((screen[2] - 60, screen[1] + 64), "Work      Method      Advisory      Contact",
           font=font(SANS, 18), fill=PAPER + (220,), anchor="rm")
    s.text((screen[0] + 70, screen[1] + 330), "Profitable customer", font=font(SERIF, 64), fill=PAPER)
    s.text((screen[0] + 70, screen[1] + 405), "relevance.", font=font(SERIF, 64), fill=PAPER)
    s.text((screen[0] + 70, screen[1] + 510), "We help you reach the right customers, give them a clear reason",
           font=font(SANS, 20), fill=PAPER + (200,))
    s.text((screen[0] + 70, screen[1] + 540), "to choose, and turn that into revenue and loyalty.",
           font=font(SANS, 20), fill=PAPER + (200,))
    s.rounded_rectangle((screen[0] + 70, screen[1] + 600, screen[0] + 330, screen[1] + 656), radius=28, fill=MINT)
    s.text((screen[0] + 200, screen[1] + 628), "Book a Clarity Sprint", font=font(SANS_MED, 18), fill=TEAL_DEEP, anchor="mm")
    s.rectangle((screen[0] + 760, screen[1] + 150, screen[2] - 70, screen[3] - 70), fill=(255, 255, 255, 20))
    s.text(((screen[0] + 760 + screen[2] - 70) / 2, (screen[1] + 150 + screen[3] - 70) / 2), "Drop photography here",
           font=font(SANS, 18), fill=PAPER + (110,), anchor="mm")
    save("09-website-laptop", "Website on laptop", [
        ("Background", "Surface", bg),
        ("Shadows", "Shadow — laptop", shadow(Image.composite(Image.new("L", (W, H), 255), base_mask, base_mask), (0, 16), 30, 0.4)),
        ("Shadows", "Shadow — lid", shadow(m_lid, (0, 10), 30, 0.2)),
        ("Objects", "Laptop", dev),
        ("Objects", "Website — home page", site),
        (LOGO, "Logo — site header" + TIP, place(wordmark(PAPER + (255,), 28), topleft=(screen[0] + 70, screen[1] + 50))),
        ("Lighting", "Screen glare", lighting(35)),
    ])


def m10_flight_case():
    bg = textured((58, 60, 58), 9)
    case = (420, 300, 1980, 1380)
    m_case = rect_mask(case, 24)
    body = fill_shape(m_case, (34, 36, 36), 6)
    d = ImageDraw.Draw(body)
    for x in (case[0], case[2] - 110):
        for y in (case[1], case[3] - 110):
            d.rounded_rectangle((x, y, x + 110, y + 110), radius=18, fill=(170, 174, 174, 255))
            d.ellipse((x + 45, y + 45, x + 65, y + 65), fill=(110, 112, 112, 255))
    d.rectangle((case[0], 820, case[2], 860), fill=(150, 154, 154, 255))
    for x in (800, 1600):
        d.rounded_rectangle((x - 60, 790, x + 60, 890), radius=10, fill=(190, 194, 194, 255))
    sticker_box = (900, 470, 1500, 730)
    m_st = rect_mask(sticker_box, 20)
    tape = blank()
    td = ImageDraw.Draw(tape)
    td.rectangle((520, 1080, 1020, 1160), fill=(232, 228, 214, 235))
    td.text((540, 1120), "CAM A  ·  FX3  ·  KATUNGO", font=font(SANS_BOLD, 30), fill=INK + (230,), anchor="lm")
    save("10-flight-case", "Kit flight case sticker", [
        ("Background", "Studio floor", bg),
        ("Shadows", "Shadow — case", shadow(m_case, (0, 30), 40, 0.55)),
        ("Objects", "Flight case", body),
        ("Objects", "Sticker — mint", fill_shape(m_st, MINT, 3)),
        ("Objects", "Gaffer label", tape),
        (LOGO, "Logo — sticker" + TIP, place(wordmark(TEAL_DEEP + (255,), 70), (1200, 600))),
        ("Lighting", "Top light", lighting(60)),
    ])


def m11_proposal():
    bg = textured(STONE, 6)
    cover = (300, 200, 300 + 900, 200 + 1270)
    spread = (1330, 300, 1330 + 820, 300 + 1160)
    m_c, m_s = rect_mask(cover), rect_mask(spread)
    page = blank()
    d = ImageDraw.Draw(page)
    d.text((spread[0] + 70, spread[1] + 100), "The Story-to-Scale Method", font=font(SERIF, 44), fill=TEAL)
    stages = [
        ("01", "Find the right customers"),
        ("02", "Sharpen the reason to choose"),
        ("03", "Capture the proof"),
        ("04", "Build the system"),
        ("05", "Convert and keep"),
    ]
    y = spread[1] + 240
    for n, s in stages:
        d.text((spread[0] + 70, y), n, font=font(SANS_BOLD, 28), fill=(32, 160, 114))
        d.text((spread[0] + 150, y), s, font=font(SANS_MED, 28), fill=INK)
        d.rectangle((spread[0] + 150, y + 52, spread[0] + 700, y + 56), fill=(0, 0, 0, 30))
        d.rectangle((spread[0] + 150, y + 74, spread[0] + 620, y + 78), fill=(0, 0, 0, 30))
        y += 160
    d.text((spread[0] + 70, spread[3] - 70), "Clarity Sprint  ·  Build  ·  Run", font=font(SANS, 22), fill=INK + (170,))
    cov = text_layer([
        ((cover[0] + 80, cover[1] + 760), "Clarity Sprint", font(SERIF, 96), PAPER + (255,), "ls"),
        ((cover[0] + 80, cover[1] + 830), "Proposal prepared for  [Client name]", font(SANS, 28), PAPER + (210,), "ls"),
        ((cover[0] + 80, cover[3] - 80), "October 2026", font(SANS, 24), PAPER + (180,), "ls"),
    ])
    accent = blank()
    ImageDraw.Draw(accent).rectangle((cover[0] + 80, cover[1] + 640, cover[0] + 200, cover[1] + 646), fill=MINT)
    save("11-proposal", "Clarity Sprint proposal", [
        ("Background", "Surface", bg),
        ("Shadows", "Shadow — cover", shadow(m_c, (0, 22), 32, 0.32)),
        ("Shadows", "Shadow — inner page", shadow(m_s, (0, 18), 28, 0.26)),
        ("Objects", "Inner page", fill_shape(m_s, PAPER)),
        ("Objects", "Cover — Forest Teal", fill_shape(m_c, TEAL, 4)),
        ("Objects", "Mint rule", accent),
        ("Type", "Cover type", cov),
        ("Type", "Method page", page),
        (LOGO, "Logo — cover" + TIP, place(wordmark(PAPER + (255,), 50), topleft=(cover[0] + 80, cover[1] + 90))),
        (LOGO, "Logo — page footer" + TIP,
         place(monogram(PAPER + (255,), TEAL + (255,), 64), (spread[2] - 100, spread[3] - 80))),
        ("Lighting", "Light fall-off", lighting(45)),
    ])


def m12_billboard():
    sky = blank()
    grad = Image.linear_gradient("L").resize((W, H))
    sky_img = Image.composite(Image.new("RGB", (W, H), (236, 214, 178)), Image.new("RGB", (W, H), (120, 170, 196)), grad)
    sky.paste(sky_img.convert("RGBA"))
    ground = blank()
    ImageDraw.Draw(ground).rectangle((0, 1380, W, H), fill=(92, 86, 74, 255))
    board = (260, 220, 2140, 1000)
    structure = blank()
    sd = ImageDraw.Draw(structure)
    sd.rectangle((1130, 1000, 1270, 1400), fill=(60, 62, 62, 255))
    sd.rectangle((board[0] - 30, board[1] - 30, board[2] + 30, board[3] + 30), fill=(48, 50, 50, 255))
    sd.rectangle((board[0], board[3] + 30, board[2], board[3] + 44), fill=(80, 82, 82, 255))
    face = fill_shape(rect_mask(board), TEAL, 3)
    copy = text_layer([
        ((board[0] + 110, board[1] + 330), "Reach the right customers.", font(SERIF, 110), PAPER + (255,), "ls"),
        ((board[0] + 110, board[1] + 470), "Give them a reason to choose you.", font(SERIF, 72), MINT + (255,), "ls"),
    ])
    save("12-billboard", "Roadside billboard", [
        ("Background", "Sky", sky),
        ("Background", "Ground", ground),
        ("Objects", "Billboard structure", structure),
        ("Objects", "Billboard face", face),
        ("Type", "Campaign line", copy),
        (LOGO, "Logo — billboard" + TIP, place(wordmark(PAPER + (255,), 70), topleft=(board[0] + 110, board[3] - 160))),
        ("Lighting", "Evening light", lighting(40)),
    ])


def export_logos():
    wordmark(TEAL + (255,), 300).save(os.path.join(OUT_LOGO, "katungo-wordmark-teal.png"))
    wordmark(PAPER + (255,), 300).save(os.path.join(OUT_LOGO, "katungo-wordmark-paper.png"))
    monogram(PAPER + (255,), TEAL + (255,), 800).save(os.path.join(OUT_LOGO, "katungo-monogram-teal.png"))
    monogram(TEAL + (255,), MINT + (255,), 800).save(os.path.join(OUT_LOGO, "katungo-monogram-mint.png"))


if __name__ == "__main__":
    for d in (OUT_PSD, OUT_PNG, OUT_LOGO):
        os.makedirs(d, exist_ok=True)
    export_logos()
    for fn in (m01_cover, m02_business_cards, m03_stationery, m04_tote, m05_crew_pass, m06_studio_sign,
               m07_poster, m08_social, m09_laptop, m10_flight_case, m11_proposal, m12_billboard):
        fn()
