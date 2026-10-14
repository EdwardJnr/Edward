# Exquisite Cars — Behance case study

Self-initiated concept. Sixteen panels, each 1400 px wide, exported at 2× (2800 px) as JPEG.

## Files

- `index.html` — all 16 panels in one page. Open it in a browser to scroll the full case study.
- `exports/` — upload-ready panels, numbered in Behance order.
- `assets/` — the supplied logo cleaned onto transparency (primary, reversed, mono white), the X monogram (SVG) and Montserrat.
- `render.js` — re-exports every panel: `NODE_PATH=$(npm root -g) node render.js 2`

## Replacing the vehicle illustrations with photography

Every image area loads a photograph first if it exists, and otherwise falls back to the rim-lit silhouette.
Drop JPEGs into `photos/` with these names, then re-run `render.js`:

| File | Panel |
|---|---|
| `01-hero.jpg` | Cover, full bleed |
| `02-detail.jpg` | Opening statement, right half |
| `03-architecture.jpg`, `03-detail.jpg`, `03-interior.jpg`, `03-harare.jpg` | Moodboard |
| `06-hero.jpg`, `06-front.jpg`, `06-wheel.jpg`, `06-rear.jpg` | Art direction |
| `07-poster.jpg` | Campaign master |
| `08-executive.jpg`, `08-everyday.jpg`, `08-select.jpg` | Triptych |
| `12-facade.jpg` | Showroom exterior |
| `14-billboard.jpg` | Billboard scene |
| `16-closing.jpg` | Closing frame |

Leave negative space on the left of the cover, poster and triptych frames so the headlines stay clear.

## Before publishing

- Ask the dealership for the vector logo. The supplied file is 531 px and has been upscaled.
- Colours: navy `#1F3B60` and green `#3EAB52` were sampled from the supplied file.
- Names, phone numbers, prices and specifications are fictitious placeholders.
- Behance tags: Automotive Branding, Brand Identity, Art Direction, Automotive Advertising, Graphic Design, Digital Experience, Social Media Design, Zimbabwe.
