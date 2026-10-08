# Katungo identity mockups

Twelve layered Photoshop mockups (2400 × 1600 px) that present the Katungo identity in the manner of a brand identity case study.

| File | Application |
|---|---|
| `01-cover` | Identity cover: wordmark on Forest Teal, the three pillars, Harare → Lagos → London |
| `02-business-cards` | Business cards, front and back |
| `03-stationery` | A4 letterhead, DL envelope, compliment slip |
| `04-tote-bag` | Canvas tote, "Your story, at scale." |
| `05-crew-pass` | Crew lanyard pass for shoots |
| `06-studio-signage` | Studio fascia, window vinyl, door |
| `07-poster` | Framed poster, "From Harare, to everywhere." |
| `08-social-profile` | Instagram profile on a phone |
| `09-website-laptop` | Website home page on a laptop |
| `10-flight-case` | Kit flight case with sticker and gaffer label |
| `11-proposal` | Clarity Sprint proposal, cover and method page |
| `12-billboard` | Roadside billboard |

- `psd/`: the layered files
- `previews/`: JPEG previews
- `logo/`: the placeholder wordmark and monogram as transparent PNGs
- `build_mockups.py`: regenerates everything (`pip install psd-tools pillow numpy`)

## Replacing the logo

Every PSD has a group called **REPLACE LOGO**. Each logo placement is its own layer inside it, and every other layer stays untouched.

1. Open the PSD and expand **REPLACE LOGO**.
2. Right-click a logo layer, then choose **Convert to Smart Object**.
3. Double-click the smart object thumbnail, paste your logo in, then save and close. The mockup updates.
4. Repeat for each placement. Placements on dark grounds want the light version of the mark; placements on paper want the teal version.

Every object is laid out flat and square to camera, so a logo never needs warping or perspective.

## Things to swap before the work goes public

- **Typefaces.** The type is set in Caladea (serif) and Inter (sans) because those are the faces on the build machine. Swap Inter for Helvetica, and Caladea for the final wordmark face.
- **Contact details.** `hello@katungo.studio` and `katungo.studio` are placeholders.
- **Photography.** The laptop's hero has a placeholder panel marked "Drop photography here". Real work from the studio belongs there.
