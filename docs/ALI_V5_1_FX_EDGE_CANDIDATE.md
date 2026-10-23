# Ali V5.1 — F4/F5 FX hard-edge comparison (review only)

**NOT a V6 full-redraw submission, NOT approved for production.** This is a local-only optional test pack, created from the already unapproved Ali V5 candidate. All files remain on the player's device; browser import is gated by exact SHA-256.

## Why

The source F4/F5 sprites have recognizable Ali full-body artwork but visible rectangular alpha boundaries in the cyan palm-strike energy, especially along the top and right edges. V5's F5 **still uses a borrowed/composited lower leg** (see Issue #18), so reducing its FX boundary does not satisfy independent authored keyframes.

## Changes made to real PNG source

- Source V5 full combat atlas: SHA-256 `43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521`.
- Optional V5.1 FX-only candidate atlas: SHA-256 `0efa47867d718c0a5b8374fecb19f449037e22da755ebe11a1f0aedbc2457674`.
- Only `light3-03.png` (Light3 F4) and `light3-04.png` (Light3 F5) change: selected bright cyan-effect **alpha** pixels are feathered at rectangular clip edges. Their **RGB channels are byte-identical** to the V5 source; no body/joints/garment/hair/boots have been independently authored. 16 of 18 frames are identical.
- Geometry: each RGBA frame is 720×540, atlas 4320×1620. The existing Light1/2/3 duration arrays and pivot (320,525) are untouched.
- The downloaded user-facing ZIP `PENABUR_Combat_Ali_FX_Edge_Review_V5_1.zip` includes 18 frames, atlas, unapproved manifest and a checkerboard **before/after F4-F5** image. This PR intentionally contains **no binary PNG art** and does not change production assets.

## How to compare

1. Extract the V5.1 ZIP delivered in the project conversation.
2. Open the Vercel Preview at `/review/ali-combo-v2.html`, select the local V5.1 `ali-combat-frames.png`, inspect F4/F5 against approved original Ali, mirrored direction, ground line and internal alpha cut warnings. The studio accepts this exact SHA only.
3. Open `/?aliArtReview=v51` to load and test the same local PNG during real Ali-vs-Elton duel. Available tools: 0.25×/0.5×/1× simulation speed and local PNG capture. An unmatched/fake file is rejected and the approved original sprite remains active.
4. Compare V5 and V5.1. **Do not** select V5.1 as artist-approved solely because visual edge cuts improve.

## Release blockers

Issue [#18](https://github.com/eltonmalumbot/penaburcombat/issues/18) remains OPEN; PR #20 strictly requires **independently authored** source PNG F4/F5 with full real lower-leg anatomy, rights provenance, and actual mobile QA. The V5.1 candidate does not meet those requirements. No production merge or replacement of original asset.
