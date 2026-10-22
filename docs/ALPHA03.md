# Alpha v0.3 — Responsive Combat (draft)
This branch is QA-only and must not merge before approval.

## Input and feel
- **140ms attack buffer**, measured in simulation frames. Invalid or unaffordable inputs expire rather than firing indefinitely.
- **Light combo cancel** after a connected light strike has passed its active window plus 55ms; no cancel for heavy, skill, or ultimate. Three-hit cap and damage values are unchanged.
- **Acceleration and braking** for ground/air horizontal input; dash, walls, knockback, and CPU retain existing limits. Connected light recovery allows 35% movement only.
- **Mobile controls** split into left directional pad and right attack cluster, supporting simultaneous independent pointer captures and explicit pointer cleanup.
- **Hit feedback** uses short-lived impact rings and optional user-initiated tap haptics; gameplay frame timing and damage remain unchanged.

## Test plan
Run `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:atlas`, plus a real mobile multi-touch smoke test. Review CPU difficulty and combo pacing before merge. Preview status and HTTP checks are necessary but not sufficient for final QA.

Original character PNGs and atlas metadata are untouched. Do not release or merge this draft before deployed gameplay is reviewed.
