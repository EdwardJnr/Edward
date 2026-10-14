"""Build an InDesign IDML catalogue from the Christmas promo sheet.

Layout follows the reference promo page: a light section title, a rounded
panel holding a 5-column product grid, each product with an image frame,
item code, bold product family and a red price badge.

Usage: python3 build_idml.py
Output: Christmas_Promo_Catalogue.idml (+ layout_preview.png)
"""
import csv, io, os, re, shutil, zipfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source.csv")
TPL = os.path.join(HERE, "template")
OUT = os.path.join(HERE, "Christmas_Promo_Catalogue.idml")

# ---------------------------------------------------------------- page geometry (pt)
W, H = 595.2755905511812, 841.8897637795275        # A4 portrait
M = 22.677                                         # 8 mm margins
COLS, GUT = 5, 7.0
CW = W - 2 * M
COL_W = (CW - GUT * (COLS - 1)) / COLS
IMG_H, TXT_GAP, TXT_H = 92.0, 4.0, 54.0
ROW_H = IMG_H + TXT_GAP + TXT_H
ROW_GAP = 8.0
PANEL_PAD = 9.0
HEAD_H = 40.0
SECTION_GAP = 14.0
FOOT_H = 16.0
BOTTOM = H - M - FOOT_H
BADGE_W, BADGE_H = 52.0, 17.0

# ---------------------------------------------------------------- data
CATEGORY_MAP = {
    "wall lights": "Wall Lights", "wall light": "Wall Lights",
    "tubes&fittings": "Tubes & Fittings", "tubes": "Tubes & Fittings",
    "track lighting": "Track Lighting", "table lamps": "Table Lamps",
    "strip light": "Strip Lights", "street lights": "Street Lights",
    "spot lt": "Spotlights", "spot light": "Spotlights", "spot": "Spotlights",
    "spike lights": "Spike Lights", "solar lighting": "Solar Lighting",
    "rope light": "Rope Lights", "pendants": "Pendants",
    "panel lights": "Panel Lights", "panel light": "Panel Lights",
    "outdoor lighting": "Outdoor Lighting", "lighting accessories": "Lighting Accessories",
    "led strip light": "LED Strip Lights", "led light": "LED Lights",
    "lamp post": "Lamp Posts", "lamp holder": "Lamp Holders",
    "inground lights": "Inground Lights", "indoor lighting": "Indoor Lighting",
    "highbay light": "Highbay Lights", "g9": "G9 Bulbs", "footlight": "Footlights",
    "flood light": "Floodlights", "fixture": "Fixtures", "extractor fans": "Extractor Fans",
    "e27": "E27 Bulbs", "downlighters": "Downlights", "downlighter": "Downlights",
    "downlight": "Downlights", "decorative": "Decorative Lighting",
    "ceiling light": "Ceiling Lights", "bulkheads": "Bulkheads", "bulb": "Bulbs",
    "brick lt": "Brick Lights", "brick light": "Brick Lights",
    "bollards": "Bollards", "bollard": "Bollards", "b22": "B22 Bulbs",
    "ac floodlights": "AC Floodlights",
}


def load_rows():
    raw = open(SRC, "rb").read().decode("cp1252")
    rows = list(csv.reader(io.StringIO(raw)))
    items, extra = [], False
    for r in rows[1:]:
        r = (r + [""] * 16)[:16]
        code, name, cat = r[0].strip(), " ".join(r[1].split()), r[2].strip()
        if code.upper().startswith("POMONA ADDITIONAL"):
            extra = True
            continue
        if not code or not name:
            continue
        section = "Additional Lines" if extra else CATEGORY_MAP.get(cat.lower(), cat.title())
        price = None
        p = r[5].strip().replace("$", "").replace(",", "").strip()
        if p and p not in ("-",):
            try:
                price = float(p)
            except ValueError:
                price = None
        items.append(dict(code=code, name=name, section=section, price=price))
    return items


def split_name(name):
    """Bold the product family (leading capitalised word run), as on the reference page."""
    words = name.split(" ")
    bold = []
    for w in words:
        core = re.sub(r"[^A-Za-z]", "", w)
        if len(core) >= 3 and core.isupper() and not re.match(r"^\d", w):
            bold.append(w)
        else:
            break
    if not bold:
        bold = words[:2]
    rest = name[len(" ".join(bold)):]
    return " ".join(bold), rest


def sections_in_order(items):
    out = []
    for it in items:
        if out and out[-1][0] == it["section"]:
            out[-1][1].append(it)
        else:
            out.append((it["section"], [it]))
    return out

# ---------------------------------------------------------------- IDML helpers
_id = [0x2000]


def uid():
    _id[0] += 1
    return "u%x" % _id[0]


def path(x, y, w, h):
    pts = [(x, y), (x, y + h), (x + w, y + h), (x + w, y)]
    return "".join(
        '<PathPointType Anchor="{0} {1}" LeftDirection="{0} {1}" RightDirection="{0} {1}" />'.format(px, py)
        for px, py in pts)


COMMON = ('ParentInterfaceChangeCount="" TargetInterfaceChangeCount="" LastUpdatedInterfaceChangeCount="" '
          'OverriddenPageItemProps="" ItemLayer="ua4" Locked="false" LocalDisplaySetting="Default" Visible="true" '
          'ItemTransform="1 0 0 1 0 0"')


def corners(r):
    if not r:
        return ""
    return "".join(' %sCornerOption="RoundedCorner" %sCornerRadius="%s"' % (c, c, r)
                   for c in ("TopLeft", "TopRight", "BottomLeft", "BottomRight"))


def rect(x, y, w, h, fill="Swatch/None", stroke="Swatch/None", sw=0, radius=0, name="$ID/", graphic=False):
    y -= H / 2
    fit = ('<FrameFittingOption AutoFit="true" LeftCrop="0" TopCrop="0" RightCrop="0" BottomCrop="0" '
           'FittingOnEmptyFrame="Proportionally" FittingAlignment="CenterAnchor" />') if graphic else ""
    return ('<Rectangle Self="%s" ContentType="%s" StoryTitle="$ID/" %s Name="%s" FillColor="%s" StrokeColor="%s" '
            'StrokeWeight="%s"%s AppliedObjectStyle="ObjectStyle/$ID/[Normal Graphics Frame]">'
            '<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>%s</PathPointArray>'
            '</GeometryPathType></PathGeometry></Properties>%s</Rectangle>') % (
        uid(), "GraphicType" if graphic else "Unassigned", COMMON, escape(name, {'"': "&quot;"}), fill, stroke, sw,
        corners(radius), path(x, y, w, h), fit)


STORIES = []


def text_frame(x, y, w, h, paras, fill="Swatch/None", radius=0, vjust="TopAlign", inset=0):
    sid = uid()
    STORIES.append((sid, paras))
    y -= H / 2
    return ('<TextFrame Self="%s" ParentStory="%s" PreviousTextFrame="n" NextTextFrame="n" ContentType="TextType" %s '
            'Name="$ID/" FillColor="%s" StrokeColor="Swatch/None" StrokeWeight="0"%s '
            'AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]">'
            '<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>%s</PathPointArray>'
            '</GeometryPathType></PathGeometry></Properties>'
            '<TextFramePreference TextColumnCount="1" TextColumnFixedWidth="%s" InsetSpacing="%s %s %s %s" '
            'FirstBaselineOffset="AscentOffset" VerticalJustification="%s" AutoSizingType="Off" />'
            '</TextFrame>') % (uid(), sid, COMMON, fill, corners(radius), path(x, y, w, h), w, inset, inset, inset,
                               inset, vjust)


def run(text, cstyle="$ID/[No character style]", br=False):
    return '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/%s"><Content>%s</Content>%s</CharacterStyleRange>' % (
        cstyle, escape(text), "<Br />" if br else "")


def para(pstyle, runs):
    return '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/%s">%s</ParagraphStyleRange>' % (pstyle, "".join(runs))


def story_xml(sid, paras):
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="10.0">'
            '<Story Self="%s" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
            '<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" '
            'StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection" />'
            '<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />'
            '%s</Story></idPkg:Story>') % (sid, "".join(paras))

# ---------------------------------------------------------------- layout


def price_runs(price):
    if price is None:
        return [run("PRICE TBC", "Price_TBC")]
    whole, cents = ("%.2f" % price).split(".")
    whole = "{:,}".format(int(whole))
    return [run("$", "Price_Small"), run(whole, "Price_Main"), run("." + cents, "Price_Small")]


def product(x, y, it, items_out):
    items_out.append(rect(x, y, COL_W, IMG_H, fill="Color/Image Placeholder", name=it["code"], graphic=True))
    ty = y + IMG_H + TXT_GAP
    bold, rest = split_name(it["name"])
    items_out.append(text_frame(x, ty, COL_W, TXT_H, [
        para("Item_Code", [run(it["code"], br=True)]),
        para("Item_Name", [run(bold, "Name_Bold"), run(rest)]),
    ]))
    fill = "Color/Promo Red" if it["price"] is not None else "Color/TBC Grey"
    items_out.append(text_frame(x + COL_W - BADGE_W, ty, BADGE_W, BADGE_H,
                                [para("Price_Badge", price_runs(it["price"]))],
                                fill=fill, radius=3, vjust="CenterAlign"))


def layout(items):
    pages = []          # each: dict(bg=[], fg=[], boxes=[]) boxes for preview
    page = None
    y = 0.0

    def new_page():
        nonlocal page, y
        page = dict(bg=[], fg=[], preview=[])
        pages.append(page)
        y = M
        if len(pages) == 1:
            page["fg"].append(text_frame(M, y, CW, 34, [para("Masthead", [run("Christmas Promo Selection")])]))
            page["fg"].append(rect(M, y + 38, 60, 3, fill="Color/Promo Red"))
            page["preview"].append(("mast", M, y, CW, 41))
            y += 54

    def open_panel(title):
        nonlocal y
        page["fg"].append(text_frame(M, y, CW, HEAD_H - 6, [para("Section_Title", [run(title)])], vjust="BottomAlign"))
        page["preview"].append(("title", M, y, CW, HEAD_H - 6, title))
        y += HEAD_H
        return y

    def close_panel(top):
        page["bg"].append(rect(M - 4, top, CW + 8, y - top - ROW_GAP + 2 * PANEL_PAD,
                               fill="Color/Panel Fill", stroke="Color/Panel Line", sw=0.5, radius=6))
        page["preview"].append(("panel", M - 4, top, CW + 8, y - top - ROW_GAP + 2 * PANEL_PAD))

    new_page()
    for title, its in sections_in_order(items):
        rows = [its[i:i + COLS] for i in range(0, len(its), COLS)]
        need = HEAD_H + 2 * PANEL_PAD + ROW_H
        if y + need > BOTTOM:
            new_page()
        top = open_panel(title)
        y += PANEL_PAD
        first = True
        for row in rows:
            if y + ROW_H + PANEL_PAD > BOTTOM:
                close_panel(top)
                new_page()
                top = open_panel(title + " (continued)")
                y += PANEL_PAD
            for c, it in enumerate(row):
                x = M + c * (COL_W + GUT)
                product(x, y, it, page["fg"])
                page["preview"].append(("cell", x, y, it))
            y += ROW_H + ROW_GAP
            first = False
        close_panel(top)
        y += -ROW_GAP + 2 * PANEL_PAD + SECTION_GAP
    for n, pg in enumerate(pages, 1):
        pg["fg"].append(text_frame(M, H - M - 10, CW, 10, [para("Footer", [run("Christmas Promo Selection   |   %d" % n)])]))
    return pages

# ---------------------------------------------------------------- styles & resources


def pstyle(name, font_style, size, leading, color="Color/Ink Dark", just="LeftAlign", extra=""):
    return ('<ParagraphStyle Self="ParagraphStyle/{n}" Name="{n}" Imported="false" NextStyle="ParagraphStyle/{n}" '
            'KeyboardShortcut="0 0" FontStyle="{fs}" PointSize="{s}" FillColor="{c}" Justification="{j}" '
            'Hyphenation="false" {x}><Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn>'
            '<PreviewColor type="enumeration">Nothing</PreviewColor><Leading type="unit">{l}</Leading>'
            '<AppliedFont type="string">Myriad Pro</AppliedFont></Properties></ParagraphStyle>').format(
        n=name, fs=font_style, s=size, c=color, j=just, x=extra, l=leading)


def cstyle(name, attrs):
    return ('<CharacterStyle Self="CharacterStyle/{n}" Imported="false" KeyboardShortcut="0 0" Name="{n}" {a}>'
            '<Properties><BasedOn type="string">$ID/[No character style]</BasedOn>'
            '<PreviewColor type="enumeration">Nothing</PreviewColor>'
            '<AppliedFont type="string">Myriad Pro</AppliedFont></Properties></CharacterStyle>').format(n=name, a=attrs)


PSTYLES = "".join([
    pstyle("Masthead", "Light", 30, 34),
    pstyle("Section_Title", "Light", 26, 28),
    pstyle("Item_Code", "Bold Condensed", 8.5, 10, extra='SpaceAfter="8" RightIndent="54"'),
    pstyle("Item_Name", "Condensed", 7.5, 9),
    pstyle("Price_Badge", "Bold", 12, 13, color="Color/Paper", just="CenterAlign"),
    pstyle("Footer", "Regular", 7, 9, color="Color/TBC Grey", just="RightAlign"),
])
CSTYLES = "".join([
    cstyle("Name_Bold", 'FontStyle="Bold Condensed" PointSize="8"'),
    cstyle("Price_Main", 'FontStyle="Bold" PointSize="13"'),
    cstyle("Price_Small", 'FontStyle="Bold" PointSize="7.5" BaselineShift="4"'),
    cstyle("Price_TBC", 'FontStyle="Bold" PointSize="8"'),
])
COLORS = [("Promo Red", "0 95 90 0"), ("Ink Dark", "0 0 0 85"), ("Panel Fill", "0 0 0 3"),
          ("Panel Line", "0 0 0 15"), ("Image Placeholder", "0 0 0 7"), ("TBC Grey", "0 0 0 55")]


def build():
    items = load_rows()
    pages = layout(items)
    t = lambda p: open(os.path.join(TPL, p), encoding="utf-8").read()
    files = {}

    # Graphic: add swatches
    g = t("Resources/Graphic.xml")
    sw = "".join('<Color Self="Color/%s" Model="Process" Space="CMYK" ColorValue="%s" ColorOverride="Normal" '
                 'AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="%s" ColorEditable="true" '
                 'ColorRemovable="true" Visible="true" SwatchCreatorID="7937" />\n\t' % (n, v, n) for n, v in COLORS)
    files["Resources/Graphic.xml"] = g.replace("<Ink ", sw + "<Ink ", 1)

    # Styles
    s = t("Resources/Styles.xml")
    s = s.replace("\t</RootCharacterStyleGroup>", CSTYLES + "\n\t</RootCharacterStyleGroup>", 1)
    s = s.replace("\t</RootParagraphStyleGroup>", PSTYLES + "\n\t</RootParagraphStyleGroup>", 1)
    files["Resources/Styles.xml"] = s

    # Preferences: A4, single pages
    p = t("Resources/Preferences.xml")
    p = re.sub(r'(<DocumentPreference )PageHeight="[^"]*" PageWidth="[^"]*"(.*?)PagesPerDocument="\d+" FacingPages="\w+"',
               r'\1PageHeight="%s" PageWidth="%s"\2PagesPerDocument="%d" FacingPages="false"' % (H, W, len(pages)), p, count=1)
    p = re.sub(r'(<MarginPreference ColumnCount="1" ColumnGutter="12" )Top="36" Bottom="36" Left="36" Right="36"',
               r'\1Top="%s" Bottom="%s" Left="%s" Right="%s"' % (M, M, M, M), p, count=1)
    files["Resources/Preferences.xml"] = p
    files["Resources/Fonts.xml"] = t("Resources/Fonts.xml")

    margin = ('<MarginPreference ColumnCount="1" ColumnGutter="12" Top="{m}" Bottom="{m}" Left="{m}" Right="{m}" '
              'ColumnDirection="Horizontal" ColumnsPositions="0 {cw}" />').format(m=M, cw=CW)
    page_attrs = ('AppliedAlternateLayout="{al}" LayoutRule="Off" SnapshotBlendingMode="IgnoreLayoutSnapshots" '
                  'OptionalPage="false" GeometricBounds="0 0 {h} {w}" ItemTransform="1 0 0 1 0 {oy}" '
                  'AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" OverrideList="" '
                  'MasterPageTransform="1 0 0 1 0 0" TabOrder="" GridStartingPoint="TopOutside" UseMasterGrid="true"')

    # Master spread
    files["MasterSpreads/MasterSpread_ua5.xml"] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<idPkg:MasterSpread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="10.0">'
        '<MasterSpread Self="ua5" ItemTransform="1 0 0 1 0 0" OverriddenPageItemProps="" Name="A-Master" NamePrefix="A" '
        'BaseName="Master" ShowMasterItems="true" PageCount="1" PrimaryTextFrame="n">'
        '<Properties><PageColor type="enumeration">UseMasterColor</PageColor></Properties>'
        '<Page Self="uaa" Name="A" AppliedMaster="n" ' + page_attrs.format(al="n", h=H, w=W, oy=-H / 2) + '>'
        '<Properties><PageColor type="enumeration">UseMasterColor</PageColor></Properties>' + margin +
        '</Page></MasterSpread></idPkg:MasterSpread>')

    # Spreads
    spread_ids, first_page = [], None
    for n, pg in enumerate(pages, 1):
        sid, pid = uid(), uid()
        first_page = first_page or pid
        spread_ids.append(sid)
        files["Spreads/Spread_%s.xml" % sid] = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="10.0">'
            '<Spread Self="%s" FlattenerOverride="Default" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 0" '
            'ShowMasterItems="true" PageCount="1" BindingLocation="0" PageTransitionType="None" '
            'PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium">'
            '<Page Self="%s" Name="%d" AppliedMaster="ua5" %s>'
            '<Properties><PageColor type="enumeration">UseMasterColor</PageColor></Properties>%s</Page>'
            '%s%s</Spread></idPkg:Spread>') % (sid, pid, n, page_attrs.format(al="u9b", h=H, w=W, oy=-H / 2), margin,
                                             "".join(pg["bg"]), "".join(pg["fg"]))

    for sid, paras in STORIES:
        files["Stories/Story_%s.xml" % sid] = story_xml(sid, paras)

    # BackingStory without the template's XML structure
    files["XML/BackingStory.xml"] = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<idPkg:BackingStory xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="10.0">'
        '<XmlStory Self="u83" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">'
        '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle">'
        '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">'
        '<XMLElement Self="di3" MarkupTag="XMLTag/Root" />'
        '</CharacterStyleRange></ParagraphStyleRange></XmlStory></idPkg:BackingStory>')
    for f in ("XML/Tags.xml", "XML/Mapping.xml", "META-INF/container.xml", "META-INF/metadata.xml"):
        files[f] = t(f)

    # designmap
    d = t("designmap.xml")
    story_ids = [s for s, _ in STORIES]
    d = re.sub(r'StoryList="[^"]*"', 'StoryList="%s u83"' % " ".join(story_ids), d, count=1)
    d = d.replace('ActiveLayer="u2a8"', 'ActiveLayer="ua4"', 1)
    d = d.replace('<idPkg:Spread src="Spreads/Spread_ud6.xml" />',
                  "\n\t".join('<idPkg:Spread src="Spreads/Spread_%s.xml" />' % s for s in spread_ids))
    d = re.sub(r'<Section Self="u9b" Length="1" AlternateLayoutLength="1" AlternateLayout="[^"]*"(.*?)PageStart="udb"',
               r'<Section Self="u9b" Length="%d" AlternateLayoutLength="%d" AlternateLayout="A4 V"\1PageStart="%s"'
               % (len(pages), len(pages), first_page), d, 1, flags=re.S)
    old_stories = re.findall(r'\s*<idPkg:Story src="Stories/Story_u[0-9a-f]+\.xml" />', d)
    for o in old_stories:
        d = d.replace(o, "", 1)
    d = d.replace('<idPkg:BackingStory src="XML/BackingStory.xml" />',
                  '<idPkg:BackingStory src="XML/BackingStory.xml" />\n\t' +
                  "\n\t".join('<idPkg:Story src="Stories/Story_%s.xml" />' % s for s in story_ids))
    files["designmap.xml"] = d

    with zipfile.ZipFile(OUT, "w") as z:
        z.writestr(zipfile.ZipInfo("mimetype"), "application/vnd.adobe.indesign-idml-package",
                   compress_type=zipfile.ZIP_STORED)
        for name, data in files.items():
            z.writestr(name, data.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED)
    return items, pages


def preview(items, pages, path):
    from PIL import Image, ImageDraw, ImageFont
    s = 1.4
    pw, ph = int(W * s), int(H * s)
    show = pages[:4]
    img = Image.new("RGB", (pw * len(show) + 20 * (len(show) + 1), ph + 40), (200, 203, 208))
    font = lambda sz, b=False: ImageFont.truetype(
        "/usr/share/fonts/opentype/inter/Inter-%s.otf" % ("Bold" if b else "Regular"), int(sz * s))
    for i, pg in enumerate(show):
        ox, oy = 20 + i * (pw + 20), 20
        d = ImageDraw.Draw(img)
        d.rectangle([ox, oy, ox + pw, oy + ph], fill="white")
        for el in pg["preview"]:
            if el[0] == "panel":
                _, x, y, w, h = el
                d.rounded_rectangle([ox + x * s, oy + y * s, ox + (x + w) * s, oy + (y + h) * s], 6 * s,
                                    fill=(247, 247, 247), outline=(217, 217, 217))
        for el in pg["preview"]:
            if el[0] in ("title", "mast"):
                x, y = el[1], el[2]
                txt = el[5] if el[0] == "title" else "Christmas Promo Selection"
                d.text((ox + x * s, oy + (y + 6) * s), txt, fill=(60, 60, 60), font=font(22))
                if el[0] == "mast":
                    d.rectangle([ox + x * s, oy + (y + 38) * s, ox + (x + 60) * s, oy + (y + 41) * s], fill=(230, 36, 41))
            if el[0] == "cell":
                _, x, y, it = el
                d.rectangle([ox + x * s, oy + y * s, ox + (x + COL_W) * s, oy + (y + IMG_H) * s], fill=(236, 236, 236))
                ty = y + IMG_H + TXT_GAP
                d.text((ox + x * s, oy + ty * s), it["code"][:14], fill=(30, 30, 30), font=font(7, True))
                b, r = split_name(it["name"])
                d.text((ox + x * s, oy + (ty + 18) * s), (b + r)[:30], fill=(60, 60, 60), font=font(5.5))
                d.text((ox + x * s, oy + (ty + 26) * s), (b + r)[30:60], fill=(60, 60, 60), font=font(5.5))
                bx = x + COL_W - BADGE_W
                col = (230, 36, 41) if it["price"] is not None else (115, 115, 115)
                d.rounded_rectangle([ox + bx * s, oy + ty * s, ox + (bx + BADGE_W) * s, oy + (ty + BADGE_H) * s], 3 * s, fill=col)
                lab = ("$%.2f" % it["price"]) if it["price"] is not None else "PRICE TBC"
                d.text((ox + (bx + BADGE_W / 2) * s, oy + (ty + BADGE_H / 2) * s), lab, fill="white", font=font(8, True), anchor="mm")
    img.save(path)


if __name__ == "__main__":
    items, pages = build()
    preview(items, pages, os.path.join(HERE, "layout_preview.png"))
    secs = sections_in_order(items)
    print("items", len(items), "sections", len(secs), "pages", len(pages), "stories", len(STORIES))
    print("priced", sum(1 for i in items if i["price"] is not None))
