# Phase 3A — Full HD Combat Animation readiness (2026-10-22)

## Scope and baseline

Start from main merge `2f51f2e402beb7124ab6849b72cdd502df024107` (PR #4, visible controls). Continue the modular Canvas/Vite fighting game; do not rebuild or alter combat balance. Only **Ali** and **Elton** are playable, with the five remaining roster entries locked.

Inspected existing sources: `public/assets/fighters/{ali,elton}.{png,json}`, `src/animation/{atlas,presentation}.ts`, `src/ui/{screens,input}.ts`, `docs/SPRITE_ATLASES.md`, `public/assets/fighters/README.md`.

- Each approved atlas image is **1600 × 1080** with **eight 400 × 540 rectangles**.
- Each JSON declares frames `idle-0..3`, `walk-0..3`, but the *active* idle clip uses only `idle-0` and the active walk loop uses `walk-0, walk-1, walk-2, walk-1`. Not every packed image is an approved animation key pose.
- No authored combat clips are present yet for either fighter.
- The loader validates metadata and image bounds, uses same-origin images, handles failed load/retries, and supports per-frame foot pivots, durations, mirroring, and facing.
- `spritePresentation` falls back to the first idle frame for any absent pose, with temporary presentation cues. This is **not** finished attack or hurt animation.
- The renderer owns pixel presentation; the existing game engine and hitbox/timing files are the source of truth.

## Current clip inventory

| Clip | Ali | Elton | Phase 3A requirement |
| --- | --- | --- | --- |
| `idle` | One static active frame | One static active frame | Author coherent multi-frame breathing/stance animation |
| `walk` | Curated three-key-pose loop | Curated three-key-pose loop | Fix body/hand/equipment continuity and grounded feet |
| `jump` / `fall` | Fallback | Fallback | Separate takeoff, airborne, descending silhouettes |
| `guard` | Fallback | Fallback | Recognizable defensible pose, clear silhouette |
| `light1` / `light2` / `light3` | Fallback | Fallback | Distinct articulated strikes synchronized to game timing |
| `heavy` | Fallback | Fallback | Readable wind-up, strike, and recovery |
| `skill` / `ultimate` | Fallback | Fallback | Combat-ready anticipation/action/recovery; cinematics belong to Phase 3B |
| `hurt` | Fallback | Fallback | Clear recoil, foot and head consistency |
| `ko` | Rotated idle fallback | Rotated idle fallback | Dedicated knockdown/grounded finish, no crude rotation |
| `victory` | Fallback | Fallback | Distinct stable winning pose |

There is no separate engine `knockdown` animation clip in the current atlas contract. Decide whether to use `ko` states or extend the game pose contract in a focused, separately tested change; **do not add unused JSON labels**.

## Production art requirements (per fighter)

1. Preserve the identity, head shape, haircut, clothing and accessories in the already approved reference atlas; do not invent new likenesses from names.
2. Prepare consistent untrimmed transparent PNG frames; preserve visible limbs and keep source rectangles non-overlapping. Preserve character silhouettes and left/right orientation.
3. Store authoritative frame IDs and per-frame `pivotX`/`pivotY` in atlas metadata, aligning the actual planted foot/sole to logical ground. Do not globally rescale crouched or bent poses.
4. Define time-based clips in seconds. Loop only continuous actions; one-shot attacks, hurt, and KO must end on the authored final frame. Respect `src/game/moves.ts` start-up/active/recovery timing rather than editing damage or hitboxes.
5. Validate against both horizontal facings, browser pixel ratio, idle↔walk↔jump↔attack transitions, and missing-frame fallback.
6. Track original source assets, publication permission for each asset, source image dimensions, and checksums. Permission for face likeness does not imply trademark/logo permission.

## Code-first tasks (no additional art necessary)

- Establish the existing `Pose` vocabulary and move timing mapping as a reference contract for the art pipeline.
- Add automated, fixture-based checks for authored atlas frame bounds, pivot validity, clip frame ordering, non-looping one-shots, and deterministic sampling at frame boundaries.
- Extend browser tests to assert missing clips never crash, animation transitions do not change world coordinates/collision, and both fighter facing directions render.
- Use synthetic sprites for new rendering-unit tests; never commit fabricated fighter art as approved Ali/Elton assets.
- Before integrating real combat frames, compare idle/walk continuity, art dimensions, transparent margins, feet alignment, and right/left orientation using the actual delivered files.

## QA and gates

`npm test`, `npm run build`, `npm run test:e2e`, and `npm run test:atlas` must pass on a proposed branch. Verify unit/combat tests, TypeScript typecheck, production Vite build, browser desktop/mobile gameplay, atlas validation, image load/fallback, and Vercel Preview. CI success is not equivalent to independent visual-art approval.

No changes to `src/game/moves.ts`, `src/game/geometry.ts`, AI, meter, HP, round/win logic or keyboard/touch input as a side effect of sprite work. Any necessary logic change must be reviewed separately.

## Asset handoff still needed

**Ali and Elton each need approved, articulated, consistent production frames** beyond existing idle/walk. Minimum set: multi-frame idle/walk cleanup, jump, fall, guard, light1–3, heavy, skill, ultimate, hurt, KO, victory. A new knocked-down pose may be needed only after deciding the engine state contract. Provide exported transparent frames or atlases and corresponding frame metadata with an explicit provenance/permission note. The existing two PNGs are suitable as identity references but cannot alone establish the missing full combat animations.

## Sequencing

1. Land the code-only validation and test hardening on a new PR with synthetic test fixtures.
2. Acquire/review Ali frames, integrate and QA them without altering combat rules.
3. Acquire/review Elton frames, integrate and QA them identically.
4. Validate side-by-side fighter continuity on desktop and mobile and merge only with passing tests, SonarCloud, Preview and visual approval.
5. Advance to Phase 3B ultimates and Phase 3C polish only after core combat readability is adequate.

## Implemented Phase 3A groundwork (code-only)

- `parseAtlas` now rejects unknown/typo clip names, fractional crop rectangles, and pivots outside a source-frame rectangle. All authorized v1 pose names come from `ATLAS_POSES`.
- Combat one-shot clips (`light1`, `light2`, `light3`, `heavy`, `skill`, `ultimate`, `hurt`, `ko`) must use `loop:false` to avoid accidental repeated attacks or a permanently looping knockout.
- New Node tests cover invalid crops, pivots, clip names and one-shot timing boundaries. A synthetic Chromium test verifies that authored attack frames actually render while missing poses still fall back safely, in both facing directions, without moving the fighter's world coordinates.
- All original assets and battle rules remain unchanged. This is a pipeline hardening step, **not** a claim that the finished HD combat frames exist.
