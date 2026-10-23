# Ali FX Polish V5 — visual candidate, not final HD art

**Status: REVIEW ONLY — NOT APPROVED.**

The local ZIP `PENABUR_Combat_Ali_FX_Polish_V5.zip` contains 18 individual PNG RGBA frames, `ali-combat-frames.png`, `manifest.json`, `validate_pack.py`, a provenance change report and visual comparisons. All image bytes are intentionally absent from GitHub; the browser loads a selected PNG **locally**, only after checking the exact SHA-256.

## What actually changed from V4

| File | Changed area on 720×540 cell | Intent |
|---|---|---|
| `light3-02.png` (third frame) | x475–525, y216–392 | soften an internal hard VFX edge |
| `light3-03.png` (fourth frame) | x577–650, y97–476 | soften a cyan-energy hard edge |
| `light3-04.png` (fifth frame) | x549–598, y154–434 | soften an abrupt energy boundary |

The other **15 frames are pixel-identical** to V4. The edits are a conservative premultiplied-alpha blur limited to the affected parts of the effect region; no new body parts or actual authored keyframes were produced.

## Asset contract

- Ali original GitHub idle/walk asset remains untouched, and its original approved SHA is pinned in the pack.
- V4 source atlas SHA-256: `b998f44db137f601617852e9fb7083a17c507839e60d562015fce8df4e660325`.
- **V5 atlas SHA-256: `43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521`.**
- PNG source 4320×1620; 18 frames of 720×540 RGBA; 6 frames per Light Combo.
- Light 1 / Light 2: 0.35 s; Light 3: 0.39 s. All authored attack clips remain non-looping.
- Full package validator: run `python validate_pack.py` from the extracted V5 ZIP. It independently verifies SHA-256s of the atlas and frames, RGBA geometry, 18-frame atlas pixel assembly, non-looping durations, unchanged source provenance and explicitly unapproved status.
- The `change-report.json` lists three modified frames and fifteen unchanged frames.

## How to review

1. Extract `PENABUR_Combat_Ali_FX_Polish_V5.zip` locally.
2. Visit this branch's `/review/ali-combo-v2.html` and open `ali-combat-frames.png` to inspect precise poses, both facings, internal hard-cut warnings and ground alignment.
3. Visit `/?aliArtReview=v5` for actual duel context; use 0.25× slow motion, Capture PNG and normal-speed playback.
4. If the image fails exact checksum, the browser **rejects it**. If no image is loaded, original GitHub sprite is used.
5. Compare V4/V5 `ali-v4-v5-fx-compare.jpg` (included) to decide whether FX readability improved.

## Unresolved production blockers

- **Light3 frame 5 still uses a borrowed composite lower leg from V4**. Premultiplied-alpha smoothing cannot replace independently drawn anatomy.
- Some abrupt cut regions remain across other combo clips (see `docs/ALI_V4_INTERNAL_ALPHA_AUDIT.md`); visual review is not replaced by checksum success.
- Real Android and iPhone device QA, owner visual approval and separately authored Elton combat animations are outstanding.
- Do not merge any unapproved art into `main`. No V5 asset has been activated or uploaded by this review-only PR.
