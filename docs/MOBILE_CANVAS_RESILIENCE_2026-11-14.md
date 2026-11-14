# PENABUR Combat — mobile Canvas resilience (14 November 2026)

**Scope:** Review-only rendering and accessibility hardening on a branch stacked atop Draft PR #34. No combat rules, art, approved assets or production changes.

## Observed issues from source review

1. `GameRenderer.resize()` assigned `canvas.width` and `canvas.height` even when the requested backing resolution had not changed. Per Canvas behavior, these assignments clear the bitmap and reset the drawing context. Responsive layout callbacks can therefore cause avoidable Canvas reallocation and a transient blank/reset.
2. The match renderer stored a boolean snapshot of `prefers-reduced-motion` at construction. If the OS/browser preference was changed while a game was already open, previously active shake/sparks/impact cues could remain and new impacts could continue appearing.

## Implementation

- Retain the existing DPR-aware backing-size formula and caps. Only reassign Canvas dimensions when the calculated width or height actually changes.
- Hold a live `MediaQueryList`, check its `.matches` during each hit event and draw, and immediately clear existing visual feedback when reduction is enabled.
- These changes do **not** affect simulation time, input handling, attack windows, AI, damage, collision, or sprite selection.
- Browser regressions instrument Canvas width/height setters and verify that repeated same-size `resize()` calls preserve pixels and context state. A real size change still takes effect exactly once.
- Another browser regression toggles `prefers-reduced-motion` while retaining one renderer: active hit feedback disappears immediately; new hits are suppressed; turning the preference off allows hit feedback again.

## Validation and limits

- CI must run Node, TypeScript/build, Chromium gameplay, Chromium atlas, Python art checks and SonarCloud for this exact branch SHA.
- No device FPS, p95 render latency, memory, or physical Android/iPhone measurements have been collected. Claiming improved FPS would require an actual profile, not merely observing fewer Canvas resets.
- Manual follow-up: Android Chrome and iPhone Safari landscape/portrait resize, browser zoom, device rotation, OS Reduce Motion toggling, long-session memory/power, and both touch controls while rotating.
- All art V2/V3 and proposed V4 from the inaccessible Codex workspace remain outside this branch. No art activation or merge to `main` without explicit owner approval.
