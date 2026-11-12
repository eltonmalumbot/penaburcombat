---
name: penabur-performance
description: >
  Profile PENABUR Combat Canvas rendering and local sprite review performance,
  especially mobile frame pacing, atlas decode memory, pixel ratio and long
  sessions. Use for slow FPS, lag, memory and Vercel bundle performance.
---

# PENABUR Combat — Mobile Performance

Adapt performance-optimization discipline principles to Canvas 2D / Vite. Do not introduce a different engine.

## Baseline first

1. Identify exact git SHA, build mode, browser, viewport, DPR and device. Measure the same Ali vs Elton duel scenario before and after on the same target.
2. Frame pacing: treat 60 FPS as a 16.7 ms frame budget (30 FPS as 33.3 ms). Record average plus p95/p99, not a single FPS screenshot; a 60 Hz cap is not proof of headroom.
3. Review src/render/renderer.ts, src/animation/atlas.ts and src/main.ts for per-frame allocations, repeated PNG decoding, image smoothing state and backing-resolution scaling. Keep the original image/metadata shared where already cached.
4. Review large review-only candidate atlases: decoded RGBA pixels may consume substantially more RAM than on-disk PNG bytes. Do not load multiple giant sheets or create unnecessary re-encoded Canvas copies on mobile.
5. Prefer bounded particles, cache and efficient drawImage slicing to new rendering frameworks. Test background/tab return, slow-motion review, retina DPR, and missing-asset fallback.
6. Use a production-like Vercel Preview or local build. Compare three runs each, assess thermal throttling over longer sessions, and report device-specific results honestly.
7. Verify no unrelated gameplay drift, no visual regression and stable SHA after change.

Performance claims require actual profiling evidence. No change to gameplay rules, production assets, main, or deployment without approval.
