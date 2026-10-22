# PENABUR Combat — Ali Light Combo V2 (draft)

Updated: 2026-10-22. **VISUAL CANDIDATE; NOT PRODUCTION-APPROVED.**

## Delivered

- `frames/light1-00.png` ... `light3-05.png`: 18 individual transparent 720×540 RGBA PNG frames.
- `ali-combat-frames.png`: 4320×1620 RGBA candidate combat atlas (six columns × three rows).
- `manifest.json`: individual SHA-256 checksums, frame rectangles, pivot metadata, six-frame timing per clip, provenance.
- `source-concept-sheet.png`: generated composite sheet used as a *source*, preserved for auditing.
- `ali-v2-contact-sheet.jpg`, `ali-v2-motion-review.gif`, `preview.html`: visual review media. Extract ZIP and open `preview.html` locally for playback with reversible facing and speed.
- `validate_pack.py`, `integrate_ali_combat.py`, `ali-combat.test.ts`: offline validator, staging tool and TypeScript regression tests.

## Changes from V1

Improved extraction from a newly generated concept sheet and rejected most disconnected fragments from neighboring poses. Six-frame timing retained and moved punch/finisher key poses to the correct active windows. Corrected the prior integration-test assumptions: the combined candidate atlas is **4320×2700**, not 1600×1080; `ali.png` remains a **separate, unchanged, SHA-verified 1600×1080 file**. Added a browser-side visual motion review page and alpha-border / hash validator.

## Authoritative combat durations

| Clip | Startup | Active | Recovery | Total | Frame durations |
|---|---:|---:|---:|---:|---|
| Light 1 | 0.08 | 0.09 | 0.18 | 0.35 | .040 .040 / .035 .055 / .090 .090 |
| Light 2 | 0.08 | 0.09 | 0.18 | 0.35 | .040 .040 / .035 .055 / .090 .090 |
| Light 3 | 0.12 | 0.09 | 0.18 | 0.39 | .050 .040 .030 / .045 .045 / .180 |

Each `/` separates startup, active and recovery groups; all one-shot clips have `loop:false` and hold their last authored frame. The game engine's attack clock samples these clips as implemented in PR #8.

## Local pack test

Run `python validate_pack.py` with Pillow. Validation includes 18 source PNG hashes, 4320×1620 combat atlas checksum, RGBA and dimensions, zero alpha on frame borders, clip references, pivot rectangle bounds, exact startup/active/recovery durations, and non-looping clips. It **does not** certify likeness or motion quality.

## Staging into PENABUR Combat (after final frame review)

1. Checkout `phase3a/ali-hd-combat-animation` (or a reviewed descendant) and create a **separate review branch**. Inspect current PR #8, avoid modifying `main` or production.
2. Verify the original GitHub `public/assets/fighters/ali.png` has SHA-256 `3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905`. The user-supplied reference upload has a different byte hash. **Never substitute the upload for the repository original.**
3. `python integrate_ali_combat.py --repo /absolute/path/to/penaburcombat --dry-run` validates hash, source metadata, and expected production test fixture without writing.
4. `python integrate_ali_combat.py --repo /absolute/path/to/penaburcombat` *stages* new `ali-combat.png`, updates only `ali.json` and production-asset tests, adds `ali-combat.test.ts` and this document. It does **not** push, create a PR, merge, or deploy.
5. Run `npm test && npm run build && npm run test:atlas && npm run test:e2e` and inspect actual desktop/mobile Preview. Check both facings, grounding, actual hit contacts, equipment and uniform continuity, and effects.
6. Require owner visual approval and matching GitHub Actions/SonarCloud/Vercel Preview commit IDs before merge.

## Unresolved blockers

The generated sprites are **not byte-identical renderings of the GitHub reference character** and must be inspected for shirt/ID card/equipment/face consistency. Some energy effects in the generated source crossed storyboard cells, so a few cyan trails are faded or abbreviated at frame boundaries. Transparent-border tests do not prove art is visually perfect. The 2D generated pose pivots use a consistent metadata floor, but true sole/feet alignment and animation smoothness still need playback review. There is **no measured real-device FPS or Safari QA**. No access to the exact GitHub original PNG bytes was available for a complete merged atlas in this workspace; the script guards against accidentally using the different-hash upload.

## Non-goals and release boundary

No engine, collision, hitbox, damage, combo balance, meter, AI, input, controls, Elo, roster, or Elton art changes. **No GitHub commit, PR, merge or Vercel deployment is represented by this V2 delivery.**
## Pull request boundary

This review-only pull request does **not** contain or activate PNG art. The V2 zip is delivered in the linked ChatGPT conversation, not hosted as a public/CI-accessible GitHub asset. Do not change `public/assets/fighters/ali.json` to reference unavailable image bytes. Integrate only after manually uploading reviewed frames, and run the included `integrate_ali_combat.py` from the V2 pack in a clean checkout of this branch. This draft may pass CI without proving the candidate animation has been installed.
