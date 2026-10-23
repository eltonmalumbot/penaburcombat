# Ali Light Combo V4 — temporary sprite repair review

**Candidate only. NOT final authored animation, NOT approved for production.**

V4 is derived from the already reviewed V3 Cleanup ZIP. It repairs obvious Light3 frame edge artifacts and fills the missing **left leg/foot silhouette** of Light3 F5 with lower-body pixels borrowed from the nearest existing intact *Light3 combat* keyframe (F3). It does **not** reproduce artist-drawn intermediate animation or guarantee perfect identity/pivot continuity.

## Exact binary contract
- File: `PENABUR_Combat_Ali_Light_Combo_Repair_V4.zip` from the project conversation.
- Atlas inside archive: `ali-combat-frames.png`, SHA-256 `b998f44db137f601617852e9fb7083a17c507839e60d562015fce8df4e660325`.
- Atlas: 4320×1620, 18 RGBA frames (720×540 each).
- Light 1 and Light 2 retain 0.35 s each, Light 3 0.39 s; all clips non-looping.
- The original GitHub-approved Ali idle/walk PNG is untouched. **No V4 image bytes are committed in this PR.**
- The mobile art reviewer renders a two-layer virtual atlas: original Ali image for idle/walk, candidate image for Light1–3. This avoids a separate 4320×2700 bitmap allocation and heavy Canvas-to-PNG round-trip.

## How to inspect in browser
1. Open the branch Vercel preview with `/?aliArtReview=v4`, start a match and pick the local `ali-combat-frames.png` extracted from V4 ZIP.
2. Gameplay verifies the **exact checksum** before allowing candidate sprites in the in-memory Canvas atlas, and provides a reset button.
3. Inspect both directions of Ali, fast repeated Light taps, pause/resume and visual transitions; also use `/review/ali-combo-v2.html` for per-frame comparison.
4. To check ZIP bytes offline: `python validate_pack.py` inside the extracted V4 folder. This checks checksums/frames/metadata, not animation quality.

## Artwork blocker remains
Light3 F5 is a **temporary reconstructed composite**, not an independent newly drawn combat pose. It may still contain unnatural edge seam or abrupt pose motion. Artist-redraw the keyframe and approve image continuity before allowing the sprite in main. Elton combat artwork remains separately incomplete.

## QA
The review branch retains all merged-in draft gamepad/VFX code, and `main` is not affected. Browser checks cover ordinary game screen without candidate loader, rejected wrong PNG, and synthetic in-memory attack atlas. The positive **actual V4 bitmap** is loaded only in the user browser because the large image bytes are provided in the conversation ZIP, not in GitHub.
