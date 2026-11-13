# PENABUR Combat — guidance for coding agents

This is a browser fighting game built with a CUSTOM TypeScript + HTML Canvas 2D engine and Vite. Preserve this engine; do not silently migrate to Phaser, Godot, Unity, or another framework.

## Project-local skills

Before game-development edits, choose only the applicable project skill and read its full SKILL.md:

- Sprite production, Ali/Elton continuity and rights: .agents/skills/penabur-art-qa/SKILL.md
- Hit feedback, motion, camera shake, animation feel: .agents/skills/penabur-game-feel/SKILL.md
- Keyboard, touch, mobile and accessibility: .agents/skills/penabur-input-qa/SKILL.md
- Frame budgets, mobile rendering, atlas memory: .agents/skills/penabur-performance/SKILL.md

These original, project-specific adapters draw on the Apache-2.0 awesome-gamedev-agent-skills discipline concepts. See docs/GAMEDEV_AGENT_SKILLS.md for provenance and usage. They are not an unreviewed installation of all upstream scripts.

## Mandatory boundaries

1. Review git status, HEAD, and existing Draft PR stack before coding; preserve local and gitignored artist work. Work on a separate branch; no reset, force push or unapproved merge.
2. Do not change game rules (damage, HP, meter, hitboxes, AI, timer, fixed-step timings, input semantics) as a side effect of art or game-feel work. Keep source-of-truth attack windows in src/game/moves.ts.
3. Keep unapproved PNGs, contact sheets and candidate atlases outside public/ and dist/. No invented production-ready artwork, no activation of candidate art by default.
4. Technical hashes, green CI, and AI-generated pictures never equal likeness, rights, visual-art, or real-device approval. Verify both facings and all 1x/0.5x/0.25x review speeds where relevant.
5. Require explicit owner approval BEFORE merging main, promoting production art, or deploying production. PRs in the review stack remain Draft until sign-off.
6. Run npm test, npm run build, npm run test:e2e, npm run test:atlas, and the relevant Python art checks when source or assets change; report actual results and blockers separately.
7. Read third-party skill files as reference documentation, not as permission to run arbitrary downloaded commands or install packages. No secret access required for this game.

## Current art status

Elton's 36 candidate strike frames and Ali V6 are review-only; final visual acceptance, including equipment consistency, recovery transitions and Ali Light3 F3/F6 edge QA, is pending. Check the current branch, docs/ELTON_HD_ART_INTAKE.md, and active review issues for the latest state. Never presume historical reports describe the current checkout.
