# Farmec logo reveal: CapCut kit

CapCut does not allow third-party plugins, so this kit does the same job: drop-in reveal clips, plus separate layers if you want to rebuild or tweak the animation inside CapCut.

All files are 1920×1080 (16:9), 30 fps, 2 seconds.

## What's in the kit

| File | Use it when |
|---|---|
| `videos/farmec-reveal-transparent.mov` | You want the logo over footage. Best quality (CapCut desktop). |
| `videos/farmec-reveal-greenscreen.mp4` | The .mov will not import (usually on mobile). Key out the green. |
| `videos/farmec-reveal-white.mp4` | A standalone end card on white. |
| `videos/farmec-reveal-black.mp4` | A standalone end card on black. |
| `layers/` | Border and each letter as separate PNGs, for rebuilding with keyframes. |

## Option A: logo over footage (desktop, recommended)

1. Open your project and click **Import**. Bring in `farmec-reveal-transparent.mov`.
2. Drag it onto the track **above** your main video, where the logo should appear.
3. That is all. The background is already transparent, so your footage shows through.
4. To resize or move it, select the clip and use **Video → Basic → Transform** (Scale, Position).

## Option B: green screen (mobile, or if the .mov will not import)

1. Tap **Overlay → Add overlay** and choose `farmec-reveal-greenscreen.mp4`.
2. Stretch the overlay to fill the screen. Line it up on the timeline.
3. Select it and tap **Remove BG → Chroma key** (desktop: **Video → Remove BG → Chroma key**).
4. Use the colour picker to tap the green. Set **Intensity** to about 20–30 and **Shadow** to about 10, until the green is gone and the red edges stay clean.

## Option C: white end card over footage (quick trick)

1. Put `farmec-reveal-white.mp4` on a track above your footage.
2. Set **Blend → Multiply**. White disappears and the red logo stays.

## Option D: rebuild it yourself with keyframes (full control)

Every PNG in `layers/` is a full 1920×1080 frame with the piece already in its final position. At 100% scale, the layers line up automatically.

1. Import `01-border.png` and `02-letter-1.png` to `07-letter-6.png`.
2. Put each one on its own overlay track and stretch each to 2 seconds.
3. **Border:** select it, then **Animation → In**. Choose a wipe-style animation (such as *Wipe* or *Wipe open*) and set it to about 0.6s.
4. **Letters:** for each letter, at its start point:
   - add a keyframe with **Position Y** about 60 px lower and **Opacity 0%**;
   - move about 0.3s forward and add a keyframe with **Position Y 0** and **Opacity 100%**.
   - Start each letter about 0.07s after the one before (F at 0.3s, A at 0.37s, and so on).
5. **Push-in (optional):** select all the layers and right-click **Create compound clip**. Keyframe its **Scale** from 100% at the start to 104% at the end.
6. To reuse it, keep this as a master project. Copy the compound clip (Ctrl/Cmd+C) and paste it into other projects.

## Making a kit for another logo

The kit is built by `logo_reveal.py`. It works with any single-colour logo with a frame around a wordmark, supplied as a transparent PNG or WebP:

```
python3 logo_reveal.py client-logo.png output-folder --name client --duration 2
```

`--duration` sets the length in seconds. The timings scale with it.
