# Christmas Promo Selection — InDesign catalogue

`Christmas_Promo_Catalogue.idml` is built from `source.csv` (Christmas_Promo_Selection Additional Version 1) by `build_idml.py`.

**Layout**
- A4 portrait, 19 pages, 8 mm margins, 5-column product grid.
- Products follow the sheet's row order, with sections opening each time the category changes.
- Spelling variants of the same category are merged under one heading (WALL LIGHTS / Wall light → Wall Lights).
- The Pomona lines at the end of the sheet have no category, so they sit under **Additional Lines**.

**Each product**
- Image frame: grey placeholder, named with the Item No, set to auto-fit images proportionally.
- Item code: Myriad Pro Bold Condensed.
- Name: the leading family name in bold, the rest in condensed regular.
- Price badge: red, using the sheet's **Unit Price (Inflated)** column. Items with no price get a grey **PRICE TBC** badge.

**Edit the look in one place**
- Paragraph styles: Masthead, Section_Title, Item_Code, Item_Name, Price_Badge, Footer.
- Character styles: Name_Bold, Price_Main, Price_Small, Price_TBC.
- Swatches: Promo Red, Ink Dark, Panel Fill, Panel Line, Image Placeholder, TBC Grey.

**Placing photos**
- Name each photo with its Item No (`900671.jpg`; replace `/` with `-`, so `DL147-2 WHITE.jpg`).
- Run `place_product_images.jsx` (Window → Utilities → Scripts → User folder → Reveal in Finder/Explorer, copy the file in, then double-click it). It reports any items still without a photo.

**Regenerate after editing the sheet:** save it as `source.csv` here and run `python3 build_idml.py`.

Internal columns (landed cost, stock on hand, sales, rate of sale, notes) are deliberately left out of the layout.
