# PENABUR Combat — Ali V3 In-Game Playtest (Review Only)

Use the actual V3 candidate ZIP to play-test its 18 attack frames **locally in the live game engine**, without committing or uploading the unapproved PNG to GitHub/Vercel.

## Instructions
1. Open this feature branch's Vercel preview URL with `/?aliArtReview=v3`.
2. Enter a match with Ali or Elton; the gamepad and combat VFX are present from PR #13.
3. Extract `PENABUR_Combat_Ali_Light_Combo_Cleanup_V3.zip` on your own device.
4. At the bottom of the fight screen, select `ali-combat-frames.png` from the extracted folder. The browser verifies the exact SHA-256 and PNG size, builds a temporary combined HD atlas from the approved original Ali atlas, and displays Light 1/2/3 in combat.
5. Tap the LIGHT attack multiple times. Watch specifically Light3 F4/F5 (still visibly incomplete). Compare with the V2/V3 still-frame review page, and press `Kembalikan sprite Ali asli` to reset.

**This is not production artwork.** The V3 candidate is known to have cropped anatomy/effects. The UI labels it review-only. Selected PNG bytes never leave the browser; no new PNG is published or inserted in the production repo.

## Implementation boundaries
- V3 SHA-256 is pinned to `6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a`.
- The candidate image must be decoded as **4320 × 1620**, under 20 MiB, and match the pinned digest.
- Original HD idle/walk frames are used unchanged from `/assets/fighters/ali.json` and `/assets/fighters/ali.png`.
- In-memory Canvas combines 1600×1080 approved source at the top and 4320×1620 V3 combat sheet below, resulting in 4320×2700. No persistent files or writes.
- Attack frame metadata follows startup/active/recovery combat clock rather than idle-animation time, preserving 0.35 / 0.35 / 0.39 second clips without changes to the underlying combat engine.
- Alt player/CPU Ali is supported; user keeps the rest of game mechanics, control pads, and impact VFX.
- `?aliArtReview=v3` explicitly gates the importer on this branch. By default no file picker is rendered and original art remains visible.
- The code intentionally cannot mark art approved, merge a PR, or deploy production.

## Validation gates
- GitHub Actions TypeScript/build, unit, browser gameplay and atlas VFX checks.
- Browser tests with synthesized *non-likeness* rectangles establish atlas math, original idle/walk preservation and 18 one-shot frames. They are not a positive test of the actual user's PNG; the browser importer verifies its SHA at runtime.
- Manual positive test: load the full V3 PNG from the delivered ZIP in the browser, inspect both facings, frame boundaries, feet and combat timing, and record failures for reauthoring.
- Real Android Chrome and iPhone Safari are still required for final ergonomic checks.

**Remaining blocker:** Reauthor Light3 F4/F5, then perform separate explicitly approved binary-art integration. Do not merge or promote review sprites to production based solely on passing CI.
