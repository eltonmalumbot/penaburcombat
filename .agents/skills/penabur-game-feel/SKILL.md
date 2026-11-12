---
name: penabur-game-feel
description: >
  Improve PENABUR Combat attack anticipation, impact feedback, recoil,
  temporary sprite motion, particles and camera shake without changing
  actual hitboxes or damage. Use for game-feel and animation polish.
---

# PENABUR Combat — Game Feel

Uses engine-neutral game-feel principles from awesome-gamedev-agent-skills, bound to this project's existing TypeScript Canvas renderer.

## Procedure

1. Inspect src/render/renderer.ts, src/render/impact.ts, src/animation/presentation.ts, src/game/engine.ts and src/game/moves.ts. Record visual event hooks and existing effects before editing.
2. Separate visual feedback (camera offset, Canvas flash, sound, particles, alpha, easing) from engine-owned hit detection, knockback, cooldowns and attack clocks. These rules must stay unchanged unless the owner explicitly requests gameplay tuning.
3. Classify hit, blocked hit, heavy, skill and ultimate by visibility priority. Prefer two or three modest feedback channels per event; ensure effects settle fully and do not obscure Ali/Elton silhouettes or gameplay controls.
4. Avoid abrupt startup/contact/recovery pose jumps; follow the existing combat clock, never an unrelated pose's clock. Preserve authored frames over temporary fallback visuals.
5. Respect prefers-reduced-motion: suppress shake and nonessential particle flashes. Do not introduce repeated full-screen flashing or long screen freezes. Hit-stop would alter perceived/control timing; require separate approval and regression coverage before adding it.
6. Verify overlapping hits, pause/resume, rematch, both facings, and 1x/0.5x/0.25x visual review where applicable. Add deterministic Node tests and focused Chromium screenshot/pixel tests.
7. State which cues are implemented and which are still placeholders for real HD art. Report before/after visuals and test evidence.

No gameplay stats, approved art, main merge, or production deployment as a side effect of this skill.
