# Original sprite atlas integration

The default fighters retain this project's original geometric Canvas drawings. No employee photos, likenesses, Aether Clash art or third-party fighter assets were added. Only set an `atlasUrl` in `src/game/characters.ts` after the art's ownership/permission has been confirmed.

Put an approved image and metadata in `public/assets/fighters/`. For example, `Ali.atlasUrl = '/assets/fighters/ali.json'`. Both metadata and image must have the same origin as the game. The loader caches assets, validates rectangles against the decoded image, and falls back to the original Canvas drawing if loading fails. Keep the fallback until the asset pipeline has been verified.

Metadata version 1 uses untrimmed image rectangles in pixels and durations in seconds:

```json
{
  "version": 1,
  "image": "ali.png",
  "scale": 1,
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

An `idle` clip is required. Other supported clips are `walk`, `jump`, `fall`, `guard`, `light1`, `light2`, `light3`, `heavy`, `skill`, `ultimate`, `hurt`, `ko`, and `victory`. Missing clips fall back to `idle`. Non-looping clips hold their final frame. The pivot defaults to bottom-center; align feet to that pivot. Draw art facing right: the renderer mirrors it for the other direction. `scale` converts source pixels to logical arena pixels.

Animation resets when the engine pose changes. Combat startup/active/recovery and hitboxes remain authoritative in `src/game/moves.ts` and `geometry.ts`; JSON artwork must never change damage or collision. Match attack clips to those timings. Exporters must flatten rotation/trim into ordinary rectangles; rotated atlas entries are not supported. Invalid/zero durations and missing frame references are rejected before rendering.

The arena remains 1280×720 logical units. The renderer scales the backing canvas for viewport size and pixel density, caches the static stage and bounds particles. Reduced-motion users receive no hit shake or particles.
