# MVP combat audit

Historical MVP baseline. The current game is **PENABUR Combat — 16.59 — Fight for Friday!** and now has approved partial HD sprite coverage; see [PHASE2_INTEGRATION.md](PHASE2_INTEGRATION.md). Statements about stand-in-only art and optional web fonts below describe the earlier baseline, not the current build.

This change continues the existing TypeScript/Vite/Canvas game and retains its identity, arena, original stand-in art, seven roster slots, two playable fighters, keyboard/touch controls, attacks, meters, best-of-three rounds, score, pause, fighter change and rematch.

| Area | Existing problem | Change and regression coverage |
| --- | --- | --- |
| Movement/collision | Dash teleported; fighters could pass through each other on the ground. | Physical dash with cooldown, wall clamping, pushboxes and wall-aware separation. Jumping over an opponent is allowed. |
| Countdown/input | Jump/dash could run before FIGHT; held/touch inputs could outlive a screen. | Actions only run in the active phase. Input clears on navigation, pause, blur, visibility loss and pointer cancellation. Key repeat cannot spam attacks. |
| Jump | No explicit air/ground collision contract. | Ballistic jump, no double jump, deterministic landing, facing updates after a jump-over. |
| Hit detection | Center-distance checks ignored body geometry and attack phases. | Explicit facing-aware rectangles with startup, active and recovery timing. A strike connects at most once. Both strikes are sampled before damage, so trades do not favor the player. |
| Guard/CPU | `updatePerson` overwrote CPU guard with false every tick. | AI holds defensive intent between reaction decisions. Grounded facing guard reduces damage, gives defender meter, and persists through blockstun. |
| Combos | Combo/queue state mixed with UI/global state and interruption. | Bounded three-step light chain, buffered presses, hitstun cancellation and finite follow-up window. |
| Skill/ultimate | Costs, timing and damage were embedded in one function/file. | Shared move definitions, meter checks/caps, single cost per activation, interruptible startup and distinct ranges. Ultimate consumes 65 meter; skill consumes 20. |
| Rounds/results | Match transitions had no automated coverage. | Frozen combat after KO, one point per round, resets of health/meter/AI, two-win result, timeout comparison and scoreless draw replay. Rematch constructs a fresh match. |
| AI | Decisions and defense were tightly coupled with simulation/rendering. | Separate reaction-limited controller with movement, guard, jump, dash, light/heavy, skill and ultimate decisions. Seedable simulation tests. |
| Animation | Placeholder drawing was inseparable from gameplay. | Pose-driven original fallback, validated/cached JSON atlas loader, timed clips, pivots, mirroring and one-shot animation support. No unapproved assets. |
| Performance/layout | Static arena redrawn from primitives each frame; Canvas stretched at small widths. | Cached stage, bounded particle effects, fixed 60 Hz simulation with catch-up limit, DPR-aware backing size, consistent 16:9 arena and resize observation. Reduced-motion support. |
| Tooling | No lockfile or tests; CI only built. | npm lockfile, Node 24 pin, logic/atlas tests, Chromium production gameplay tests, CI with frozen install, test typechecking and failure traces. Build identity supports deployed SHA verification. |

## Modules

- `src/game`: pure combat state, geometry, character roster, moves and AI.
- `src/animation`: JSON atlas validation, loading and frame selection.
- `src/render`: cached arena, Canvas stand-ins/sprites, HUD and bounded effects.
- `src/ui`: screens and keyboard/pointer input lifecycle.
- `src/main.ts`: application navigation, fixed-step scheduling and pause.

## Validation boundaries

Run `npm run check` and `npm run test:e2e` against a production build. Browser tests cover player and CPU wins through real input/AI, KO, rounds, rematch, skill/ultimate usage, pause, input cleanup and mobile resizing. Unit tests isolate collisions, hitboxes, combo damage, guard, meter costs and timing, which a screenshot alone cannot validate. Test randomness is seeded only for repeatability; no production game-state backdoor is exposed.

The five other roster characters remain intentionally locked. Sprite artwork is still the original Canvas stand-in until approved atlases are supplied; see `SPRITE_ATLASES.md`. Google Fonts is optional and system fonts work if it is unavailable. Chromium verification does not establish coverage of every browser/device or subjective balance. Verify a deployed build's `/build-info.json` against the pushed SHA before claiming the production site is current.
