"""Editable PDF version of the Christmas promo catalogue.

- All text is live, selectable text in standard fonts (editable with Acrobat's Edit PDF tool).
- Every product image area is a clickable image button: click it in Adobe Acrobat or the free
  Acrobat Reader, choose a photo, and it drops into the box. The buttons are named by Item No.

Usage: python3 build_editable_pdf.py
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from xml.sax.saxutils import escape
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, DictionaryObject, FloatObject, NameObject, NumberObject,
                           TextStringObject)

from build_idml import load_rows, split_name, W, H, COL_W, IMG_H, TXT_GAP, TXT_H, BADGE_W, BADGE_H
from build_catalogue import build_ops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Christmas_Promo_Catalogue_EDITABLE.pdf")

C = {"Promo Red": CMYKColor(0, .95, .90, 0), "Ink Dark": CMYKColor(0, 0, 0, .85),
     "Panel Fill": CMYKColor(0, 0, 0, .03), "Panel Line": CMYKColor(0, 0, 0, .15),
     "Image Placeholder": CMYKColor(0, 0, 0, .07), "TBC Grey": CMYKColor(0, 0, 0, .55),
     "White": CMYKColor(0, 0, 0, 0)}
REG, BOLD, LIGHT = "Helvetica", "Helvetica-Bold", "Helvetica"

CODE = ParagraphStyle("code", fontName=BOLD, fontSize=8, leading=9.2, textColor=C["Ink Dark"])
NAME = ParagraphStyle("name", fontName=REG, fontSize=6.6, leading=7.9, textColor=C["Ink Dark"])


def flip(y, h):
    return H - y - h


def draw_para(c, text, style, x, y_top, w):
    p = Paragraph(text, style)
    _, ph = p.wrap(w, 1000)
    p.drawOn(c, x, H - y_top - ph)
    return ph


def draw_badge(c, o):
    x, y, w, h = o["x"], flip(o["y"], o["h"]), o["w"], o["h"]
    c.setFillColor(C[o["fill"]])
    c.roundRect(x, y, w, h, 3, stroke=0, fill=1)
    runs = o["paras"][0]
    sizes = {"Price_Main": (BOLD, 11.5, 0), "Price_Small": (BOLD, 7, 3.4), "Price_TBC": (BOLD, 7.2, 0)}
    total = sum(stringWidth(t, sizes[s][0], sizes[s][1]) for t, s in runs)
    cx = x + (w - total) / 2
    base = y + h / 2 - 3.6
    c.setFillColor(C["White"])
    for t, s in runs:
        f, sz, rise = sizes[s]
        c.setFont(f, sz)
        c.drawString(cx, base + rise, t)
        cx += stringWidth(t, f, sz)


def render(pages, path):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle("Christmas Promo Selection")
    c.setAuthor("Katungo")
    buttons = []                      # (page index, code, rect)
    for pi, ops in enumerate(pages):
        for o in ops:
            if o["t"] == "rect":
                x, y, w, h = o["x"], flip(o["y"], o["h"]), o["w"], o["h"]
                c.setFillColor(C[o["fill"]])
                if o.get("stroke"):
                    c.setStrokeColor(C[o["stroke"]]); c.setLineWidth(o["sw"])
                if o.get("r"):
                    c.roundRect(x, y, w, h, o["r"], stroke=1 if o.get("stroke") else 0, fill=1)
                else:
                    c.rect(x, y, w, h, stroke=1 if o.get("stroke") else 0, fill=1)
                if o.get("graphic"):
                    c.setFillColor(CMYKColor(0, 0, 0, .35)); c.setFont(REG, 5.5)
                    c.drawCentredString(x + w / 2, y + h / 2 - 2, "Click to add image")
                    buttons.append((pi, o["name"], [x, y, x + w, y + h]))
                continue
            st = o.get("style")
            if st == "Price_Badge":
                draw_badge(c, o)
            elif o.get("pstyles"):                       # product text block
                code = o["paras"][0][0][0]
                bold, rest = o["paras"][1][0][0], o["paras"][1][1][0]
                ch = draw_para(c, escape(code), CODE, o["x"], o["y"] + 1, COL_W - BADGE_W - 3)
                top = o["y"] + max(BADGE_H + 3, ch + 3)
                draw_para(c, "<b>%s</b>%s" % (escape(bold), escape(rest)), NAME, o["x"], top, COL_W)
            else:
                text = o["paras"][0][0][0]
                c.setFillColor(C["Ink Dark"] if st != "Footer" else C["TBC Grey"])
                if st == "Masthead":
                    c.setFont(LIGHT, 26); c.drawString(o["x"], flip(o["y"], 0) - 26, text)
                elif st == "Section_Title":
                    c.setFont(LIGHT, 21); c.drawString(o["x"], flip(o["y"], o["h"]) + 5, text)
                elif st == "Footer":
                    c.setFont(REG, 6.5); c.drawRightString(o["x"] + o["w"], flip(o["y"], o["h"]) + 2, text)
        c.showPage()
    c.save()
    return buttons


def add_image_buttons(path, buttons):
    """Overlay pushbutton fields that import an image when clicked (Acrobat / Acrobat Reader)."""
    r = PdfReader(path)
    w = PdfWriter()
    w.append(r)
    fields = ArrayObject()
    seen = {}
    for pi, code, rect in buttons:
        n = seen.get(code, 0)
        seen[code] = n + 1
        name = "IMG_" + code.replace(".", "_") + ("_%d" % (n + 1) if n else "")
        page = w.pages[pi]
        js = DictionaryObject({NameObject("/S"): NameObject("/JavaScript"),
                               NameObject("/JS"): TextStringObject("event.target.buttonImportIcon();")})
        mk = DictionaryObject({NameObject("/TP"): NumberObject(1),
                               NameObject("/IF"): DictionaryObject({
                                   NameObject("/SW"): NameObject("/A"), NameObject("/S"): NameObject("/P"),
                                   NameObject("/A"): ArrayObject([FloatObject(.5), FloatObject(.5)]),
                                   NameObject("/FB"): NameObject("/true") if False else NameObject("/false")})})
        mk[NameObject("/IF")][NameObject("/FB")] = __import__("pypdf").generic.BooleanObject(True)
        annot = DictionaryObject({
            NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Widget"),
            NameObject("/FT"): NameObject("/Btn"), NameObject("/Ff"): NumberObject(65536),
            NameObject("/T"): TextStringObject(name), NameObject("/TU"): TextStringObject("Add image: " + code),
            NameObject("/Rect"): ArrayObject([FloatObject(v) for v in rect]),
            NameObject("/F"): NumberObject(4), NameObject("/MK"): mk,
            NameObject("/A"): js, NameObject("/P"): page.indirect_reference,
        })
        ref = w._add_object(annot)
        if "/Annots" not in page:
            page[NameObject("/Annots")] = ArrayObject()
        page["/Annots"].append(ref)
        fields.append(ref)
    w._root_object[NameObject("/AcroForm")] = w._add_object(DictionaryObject({
        NameObject("/Fields"): fields, NameObject("/NeedAppearances"): __import__("pypdf").generic.BooleanObject(True)}))
    with open(path, "wb") as f:
        w.write(f)
    return len(fields)


if __name__ == "__main__":
    pages = build_ops(load_rows())
    btns = render(pages, OUT)
    n = add_image_buttons(OUT, btns)
    print(OUT, "pages", len(pages), "image buttons", n)
