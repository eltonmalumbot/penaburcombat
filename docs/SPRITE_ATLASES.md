# PENABUR Combat sprite atlas integration

Ali and Elton use the project-owner-supplied HD atlases after the owner confirmed permission to publish their likeness artwork for this game. Menus, cards and fights share the same decoded atlas cache. Poses with no sprite clip use explicit temporary HD presentation; only missing/failed atlases use geometric bodies. No employee photos or Aether Clash assets are used. See `PHASE2_INTEGRATION.md` and `public/assets/fighters/README.md` for provenance and remaining visual limitations.

Put an approved image and metadata in `public/assets/fighters/`. For example, `Ali.atlasUrl = '/assets/fighters/ali.json'`. Both metadata and image must have the same origin as the game. The loader caches assets, validates rectangles against the decoded image, and falls back to the original Canvas drawing if loading fails. Keep the fallback until the asset pipeline has been verified.

Metadata version 1 uses untrimmed image rectangles in pixels and durations in seconds:

```json
{
  "version": 1,
  "image": "ali.png",
  "scale": 1,
  "sampling": "smooth",
  "facing": "right",
  "frames": {
    "idle-0": {"x": 0, "y": 0, "w": 160, "h": 300, "pivotX": 80, "pivotY": 290},
    "idle-1": {"x": 160, "y": 0, "w": 160, "h": 300, "pivotX": 80, "pivotY": 290}
  },
  "clips": {
    "idle": {"loop": true, "frames": [{"frame": "idle-0", "duration": 0.15}, {"frame": "idle-1", "duration": 0.15}]},
    "ko": {"loop": false, "frames": [{"frame": "idle-1", "duration": 0.3}]}
  }
}
```

An `idle` clip is required. Other supported clips are `walk`, `jump`, `fall`, `guard`, `light1`, `light2`, `light3`, `heavy`, `skill`, `ultimate`, `hurt`, `ko`, and `victory`. **Missing clips use `spritePresentation`**, which selects a stable first idle frame as a temporary cutout, with separate pose cues in the renderer. This is not authored combat animation. Exact clips always take precedence and non-looping clips hold their final frame. See `PHASE2B.md`.

The pivot defaults to bottom-center; align the planted foot/sole to that pivot, not the entire rectangle. `scale` converts source pixels to logical arena pixels. Set a single scale per fighter from a known upright reference, then retain it across poses. Do not stretch crouched/leaning frames to identical heights: that distorts anatomy and hides source-art defects. Fix unintended root/foot movement in local metadata or the source drawing; never adjust combat coordinates, hitboxes or damage to fit the image.

`sampling` defaults to `smooth` (high-quality filtering for HD illustration); use `pixelated` explicitly for pixel art. `facing` defaults to `right`; `left` declares an atlas drawn facing left, which the renderer then mirrors appropriately. Legacy version-1 metadata without these fields remains valid. Canvas sampling/transforms restore after each fighter, so a sprite cannot change the placeholder or HUD's drawing state.

Animation resets when the engine pose changes. Combat startup/active/recovery and hitboxes remain authoritative in `src/game/moves.ts` and `geometry.ts`; JSON artwork must never change damage or collision. Match attack clips to those timings. Exporters must flatten rotation/trim into ordinary rectangles; rotated atlas entries are not supported. Invalid/zero durations and missing frame references are rejected before rendering.

The arena remains 1280×720 logical units. The renderer scales the backing canvas for viewport size and pixel density, caches the static stage and bounds particles. Reduced-motion users receive no hit shake or particles.

Atlas preparation commits both loaded fighters together; a superseded load cannot replace newer settings. Invalid/removed atlases revert to the original drawings. Failed loads evict their promise, and retries revalidate image bytes instead of silently reusing an invalid decoded image. Blob URLs are revoked after decoding. Ali and Elton's default paths are `/assets/fighters/ali.json` and `/assets/fighters/elton.json`; no other roster slot has an atlas or is playable.

Run `npm run test:atlas` for real Chromium decoding and Canvas pixel tests using synthetic colored rectangles and the approved original atlases. These tests cover foot pivots, scale, mirroring, HD/pixel sampling, HD-only missing-pose drawing, invalid image bounds, retry, and asynchronous preparation. They run separately from the production gameplay suite (`npm run test:e2e`). The approved-art test captures pose boards in both directions; production tests cover real matches and forced image failure.

Keep any future unapproved review art outside the repository. A local browser can intercept same-origin atlas requests for private validation. Only copy assets into `public/` after permission to publish is confirmed, since production builds include that directory. `PHASE2_REVIEW.md` records the earlier code-only review before the current owner confirmation; `PHASE2_INTEGRATION.md` is the active integration report.
