"""Builds the Christmas promo catalogue as:
  - Build_Christmas_Catalogue.jsx : run inside InDesign; creates the full layout natively and saves an .indd
  - Christmas_Promo_Catalogue_proof.pdf : PDF proof of the same layout

Data and order come from source.csv (Christmas_Promo_Selection Additional Version 1).
Usage: NODE_PATH=$(npm root -g) python3 build_catalogue.py
"""
import json, os, subprocess
from build_idml import (load_rows, split_name, sections_in_order, W, H, M, COLS, GUT, CW, COL_W, IMG_H,
                        TXT_GAP, TXT_H, ROW_H, ROW_GAP, PANEL_PAD, HEAD_H, SECTION_GAP, BOTTOM, BADGE_W, BADGE_H)

HERE = os.path.dirname(os.path.abspath(__file__))


def price_parts(price):
    if price is None:
        return None
    whole, cents = ("%.2f" % price).split(".")
    return ["$", "{:,}".format(int(whole)), "." + cents]


def build_ops(items):
    """Flat list of drawing operations, in page order and stacking order (back to front)."""
    pages = []
    state = {"y": 0.0}

    def new_page():
        pages.append({"bg": [], "fg": []})
        state["y"] = M
        if len(pages) == 1:
            pages[-1]["fg"].append(dict(t="text", x=M, y=M, w=CW, h=34, style="Masthead",
                                        paras=[[["Christmas Promo Selection", None]]]))
            pages[-1]["fg"].append(dict(t="rect", x=M, y=M + 38, w=60, h=3, fill="Promo Red"))
            state["y"] += 54

    def title(text):
        pages[-1]["fg"].append(dict(t="text", x=M, y=state["y"], w=CW, h=HEAD_H - 6, style="Section_Title",
                                    paras=[[[text, None]]], vjust="bottom"))
        state["y"] += HEAD_H
        return state["y"]

    def close(top):
        pages[-1]["bg"].append(dict(t="rect", x=M - 4, y=top, w=CW + 8,
                                    h=state["y"] - top - ROW_GAP + 2 * PANEL_PAD,
                                    fill="Panel Fill", stroke="Panel Line", sw=0.5, r=6))

    def product(x, y, it):
        fg = pages[-1]["fg"]
        fg.append(dict(t="rect", x=x, y=y, w=COL_W, h=IMG_H, fill="Image Placeholder", name=it["code"], graphic=True))
        ty = y + IMG_H + TXT_GAP
        bold, rest = split_name(it["name"])
        fg.append(dict(t="text", x=x, y=ty, w=COL_W, h=TXT_H, style=None,
                       paras=[[[it["code"], None]], [[bold, "Name_Bold"], [rest, None]]],
                       pstyles=["Item_Code", "Item_Name"]))
        pp = price_parts(it["price"])
        if pp:
            runs = [[pp[0], "Price_Small"], [pp[1], "Price_Main"], [pp[2], "Price_Small"]]
            fill = "Promo Red"
        else:
            runs = [["PRICE TBC", "Price_TBC"]]
            fill = "TBC Grey"
        fg.append(dict(t="text", x=x + COL_W - BADGE_W, y=ty, w=BADGE_W, h=BADGE_H, style="Price_Badge",
                       paras=[runs], fill=fill, r=3, vjust="center"))

    new_page()
    for sec, its in sections_in_order(items):
        rows = [its[i:i + COLS] for i in range(0, len(its), COLS)]
        if state["y"] + HEAD_H + 2 * PANEL_PAD + ROW_H > BOTTOM:
            new_page()
        top = title(sec)
        state["y"] += PANEL_PAD
        for row in rows:
            if state["y"] + ROW_H + PANEL_PAD > BOTTOM:
                close(top)
                new_page()
                top = title(sec + " (continued)")
                state["y"] += PANEL_PAD
            for c, it in enumerate(row):
                product(M + c * (COL_W + GUT), state["y"], it)
            state["y"] += ROW_H + ROW_GAP
        close(top)
        state["y"] += -ROW_GAP + 2 * PANEL_PAD + SECTION_GAP
    for n, pg in enumerate(pages, 1):
        pg["fg"].append(dict(t="text", x=M, y=H - M - 10, w=CW, h=10, style="Footer",
                             paras=[[["Christmas Promo Selection   |   %d" % n, None]]]))
    return [pg["bg"] + pg["fg"] for pg in pages]


JSX_HEAD = r'''// Builds the Christmas Promo Selection catalogue in InDesign.
// Run: Window > Utilities > Scripts. Right-click "User" > Reveal in Finder/Explorer,
// copy this file there, then double-click it in the Scripts panel.
// The finished document is saved to your Desktop as Christmas_Promo_Catalogue.indd.
#target indesign
(function () {
var PAGES = %s;
var W = %r, H = %r, M = %r;

var doc = app.documents.add();
doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS;
doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS;
doc.viewPreferences.rulerOrigin = RulerOrigin.PAGE_ORIGIN;
doc.zeroPoint = [0, 0];
doc.documentPreferences.facingPages = false;
doc.documentPreferences.pageWidth = W;
doc.documentPreferences.pageHeight = H;
doc.documentPreferences.pagesPerDocument = 1;
with (doc.masterSpreads[0].pages[0].marginPreferences) { top = M; bottom = M; left = M; right = M; }
with (doc.pages[0].marginPreferences) { top = M; bottom = M; left = M; right = M; }

function color(name, cmyk) {
    var c = doc.colors.itemByName(name);
    if (!c.isValid) c = doc.colors.add({name: name, model: ColorModel.PROCESS, space: ColorSpace.CMYK, colorValue: cmyk});
    return c;
}
var SW = {
    "Promo Red": color("Promo Red", [0, 95, 90, 0]),
    "Ink Dark": color("Ink Dark", [0, 0, 0, 85]),
    "Panel Fill": color("Panel Fill", [0, 0, 0, 3]),
    "Panel Line": color("Panel Line", [0, 0, 0, 15]),
    "Image Placeholder": color("Image Placeholder", [0, 0, 0, 7]),
    "TBC Grey": color("TBC Grey", [0, 0, 0, 55])
};
var NONE = doc.swatches.itemByName("None");
var PAPER = doc.swatches.itemByName("Paper");

function pstyle(name, fontStyle, size, leading, fill, just, extra) {
    var s = doc.paragraphStyles.itemByName(name);
    if (!s.isValid) s = doc.paragraphStyles.add({name: name});
    try { s.appliedFont = "Myriad Pro"; } catch (e) {}
    try { s.fontStyle = fontStyle; } catch (e) {}
    s.pointSize = size; s.leading = leading; s.fillColor = fill; s.justification = just; s.hyphenation = false;
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
}
function cstyle(name, props) {
    var s = doc.characterStyles.itemByName(name);
    if (!s.isValid) s = doc.characterStyles.add({name: name});
    try { s.appliedFont = "Myriad Pro"; } catch (e) {}
    for (var k in props) { try { s[k] = props[k]; } catch (e) {} }
    return s;
}
var PS = {
    "Masthead": pstyle("Masthead", "Light", 30, 34, SW["Ink Dark"], Justification.LEFT_ALIGN),
    "Section_Title": pstyle("Section_Title", "Light", 26, 28, SW["Ink Dark"], Justification.LEFT_ALIGN),
    "Item_Code": pstyle("Item_Code", "Bold Condensed", 8.5, 10, SW["Ink Dark"], Justification.LEFT_ALIGN, {spaceAfter: 8, rightIndent: 54}),
    "Item_Name": pstyle("Item_Name", "Condensed", 7.5, 9, SW["Ink Dark"], Justification.LEFT_ALIGN),
    "Price_Badge": pstyle("Price_Badge", "Bold", 12, 13, PAPER, Justification.CENTER_ALIGN),
    "Footer": pstyle("Footer", "Regular", 7, 9, SW["TBC Grey"], Justification.RIGHT_ALIGN)
};
var CS = {
    "Name_Bold": cstyle("Name_Bold", {fontStyle: "Bold Condensed", pointSize: 8}),
    "Price_Main": cstyle("Price_Main", {fontStyle: "Bold", pointSize: 13}),
    "Price_Small": cstyle("Price_Small", {fontStyle: "Bold", pointSize: 7.5, baselineShift: 4}),
    "Price_TBC": cstyle("Price_TBC", {fontStyle: "Bold", pointSize: 8})
};

function rounded(item, r) {
    if (!r) return;
    item.topLeftCornerOption = CornerOptions.ROUNDED_CORNER; item.topLeftCornerRadius = r;
    item.topRightCornerOption = CornerOptions.ROUNDED_CORNER; item.topRightCornerRadius = r;
    item.bottomLeftCornerOption = CornerOptions.ROUNDED_CORNER; item.bottomLeftCornerRadius = r;
    item.bottomRightCornerOption = CornerOptions.ROUNDED_CORNER; item.bottomRightCornerRadius = r;
}

function draw(page, o) {
    var gb = [o.y, o.x, o.y + o.h, o.x + o.w];
    if (o.t == "rect") {
        var r = page.rectangles.add({geometricBounds: gb});
        r.fillColor = o.fill ? SW[o.fill] : NONE;
        r.strokeWeight = o.sw || 0;
        r.strokeColor = o.stroke ? SW[o.stroke] : NONE;
        rounded(r, o.r);
        if (o.name) r.name = o.name;
        if (o.graphic) {
            r.contentType = ContentType.GRAPHIC_TYPE;
            try {
                r.frameFittingOptions.autoFit = true;
                r.frameFittingOptions.fittingOnEmptyFrame = EmptyFrameFittingOptions.PROPORTIONALLY;
                r.frameFittingOptions.fittingAlignment = AnchorPoint.CENTER_ANCHOR;
            } catch (e) {}
        }
        return;
    }
    var tf = page.textFrames.add({geometricBounds: gb});
    tf.fillColor = o.fill ? SW[o.fill] : NONE;
    tf.strokeWeight = 0;
    rounded(tf, o.r);
    tf.textFramePreferences.insetSpacing = [0, 0, 0, 0];
    tf.textFramePreferences.firstBaselineOffset = FirstBaseline.ASCENT_OFFSET;
    if (o.vjust == "center") tf.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
    if (o.vjust == "bottom") tf.textFramePreferences.verticalJustification = VerticalJustification.BOTTOM_ALIGN;
    var lines = [];
    for (var p = 0; p < o.paras.length; p++) {
        var s = "";
        for (var k = 0; k < o.paras[p].length; k++) s += o.paras[p][k][0];
        lines.push(s);
    }
    tf.contents = lines.join("\r");
    var story = tf.parentStory;
    for (var p = 0; p < o.paras.length; p++) {
        var para = story.paragraphs[p];
        para.appliedParagraphStyle = PS[o.pstyles ? o.pstyles[p] : o.style];
        var pos = 0;
        for (var k = 0; k < o.paras[p].length; k++) {
            var run = o.paras[p][k], len = run[0].length;
            if (run[1] && len > 0) para.characters.itemByRange(pos, pos + len - 1).appliedCharacterStyle = CS[run[1]];
            pos += len;
        }
    }
}

function build() {
    for (var i = 0; i < PAGES.length; i++) {
        var page = i == 0 ? doc.pages[0] : doc.pages.add(LocationOptions.AT_END);
        for (var j = 0; j < PAGES[i].length; j++) draw(page, PAGES[i][j]);
    }
}
app.doScript(build, ScriptLanguage.JAVASCRIPT, undefined, UndoModes.ENTIRE_SCRIPT, "Build catalogue");

var f = File(Folder.desktop + "/Christmas_Promo_Catalogue.indd");
try { doc.save(f); alert("Catalogue built: " + PAGES.length + " pages.\nSaved to " + f.fsName); }
catch (e) { alert("Catalogue built: " + PAGES.length + " pages. Use File > Save to keep it."); }
})();
'''


def write_jsx(pages):
    path = os.path.join(HERE, "Build_Christmas_Catalogue.jsx")
    data = json.dumps(pages, ensure_ascii=True, separators=(",", ":"))
    open(path, "w", encoding="ascii").write(JSX_HEAD % (data, W, H, M))
    return path


def write_pdf(pages):
    from html import escape as e
    css = """@page{size:%spt %spt;margin:0}*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Myriad Pro','Inter',Helvetica,Arial,sans-serif;color:#262626}
    .pg{position:relative;width:%spt;height:%spt;page-break-after:always;overflow:hidden;background:#fff}
    .o{position:absolute}.tx{display:flex;flex-direction:column}
    .Masthead{font-size:30pt;font-weight:300;line-height:34pt}.Section_Title{font-size:26pt;font-weight:300;line-height:28pt}
    .Item_Code{font-size:8.5pt;font-weight:700;line-height:10pt;margin-bottom:8pt;padding-right:54pt;font-stretch:condensed}
    .Item_Name{font-size:7.5pt;line-height:9pt;letter-spacing:-.1pt}.Name_Bold{font-weight:700;font-size:8pt}
    .Price_Badge{font-size:12pt;font-weight:700;color:#fff;text-align:center;line-height:13pt}
    .Price_Main{font-size:13pt}.Price_Small{font-size:7.5pt;vertical-align:4pt}.Price_TBC{font-size:8pt}
    .Footer{font-size:7pt;color:#737373;text-align:right}""" % (W, H, W, H)
    col = {"Promo Red": "#e6232b", "Ink Dark": "#262626", "Panel Fill": "#f7f7f7", "Panel Line": "#d9d9d9",
           "Image Placeholder": "#ededed", "TBC Grey": "#737373"}
    out = []
    for pg in pages:
        out.append('<div class="pg">')
        for o in pg:
            st = "left:%.2fpt;top:%.2fpt;width:%.2fpt;height:%.2fpt;" % (o["x"], o["y"], o["w"], o["h"])
            if o.get("fill"):
                st += "background:%s;" % col[o["fill"]]
            if o.get("stroke"):
                st += "border:%spt solid %s;" % (o["sw"], col[o["stroke"]])
            if o.get("r"):
                st += "border-radius:%spt;" % o["r"]
            if o["t"] == "rect":
                out.append('<div class="o" style="%s"></div>' % st)
                continue
            jc = {"center": "center", "bottom": "flex-end"}.get(o.get("vjust"), "flex-start")
            st += "justify-content:%s;" % jc
            ps = o.get("pstyles") or [o["style"]] * len(o["paras"])
            inner = "".join('<p class="%s">%s</p>' % (ps[i], "".join(
                '<span class="%s">%s</span>' % (r[1] or "", e(r[0])) for r in para)) for i, para in enumerate(o["paras"]))
            out.append('<div class="o tx" style="%s">%s</div>' % (st, inner))
        out.append("</div>")
    html = os.path.join(HERE, "proof.html")
    open(html, "w", encoding="utf-8").write("<!doctype html><meta charset=utf-8><style>%s</style>%s" % (css, "".join(out)))
    pdf = os.path.join(HERE, "Christmas_Promo_Catalogue_proof.pdf")
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          "await p.goto('file://%s');await p.pdf({path:'%s',width:'210mm',height:'297mm',printBackground:true});"
          "await b.close()})()") % (html, pdf)
    subprocess.run(["node", "-e", js], check=True, env=dict(os.environ, NODE_PATH=subprocess.check_output(
        ["npm", "root", "-g"], text=True).strip()))
    os.remove(html)
    return pdf


if __name__ == "__main__":
    items = load_rows()
    pages = build_ops(items)
    print(write_jsx(pages))
    print(write_pdf(pages))
    print("pages", len(pages), "items", len(items))
