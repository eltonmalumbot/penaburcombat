# PENABUR Combat: gamedev agent skills integration

**Status:** project-local agent guidance only; game engine, gameplay, production assets and dependencies remain unchanged.

## Source and fit

Reviewed https://github.com/gamedev-skills/awesome-gamedev-agent-skills at upstream commit c6ca6c41c839b68319ffc08430b99ab768debc32 (2026-11-12).
Upstream library: 79 game-dev skills + router, Apache-2.0. Original upstream files are NOT copied or executed in this integration. These four independent project-local adaptations give Codex clear, offline-readable guidance specific to PENABUR Combat and credit the upstream concepts. Review upstream revisions before adopting their tools. Upstream license: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/c6ca6c41c839b68319ffc08430b99ab768debc32/LICENSE

The game is a **custom TypeScript + HTML Canvas 2D engine** with Vite, not Phaser, PixiJS, Unity, Godot, or three.js. The upstream router explicitly supports custom engines: do not migrate the codebase simply to match an engine-specific skill.

| Upstream concept | Project-local Codex skill | Current application |
| --- | --- | --- |
| [create-game-assets](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/c6ca6c41c839b68319ffc08430b99ab768debc32/skills/disciplines/create-game-assets) | penabur-art-qa | Ali V6 Light3, Elton V3 review-only sprites, contact sheets, provenance and acceptance |
| [game-feel](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/c6ca6c41c839b68319ffc08430b99ab768debc32/skills/disciplines/game-feel) | penabur-game-feel | Stable punch contact and recovery, accessible visual feedback |
| [input-systems](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/c6ca6c41c839b68319ffc08430b99ab768debc32/skills/disciplines/input-systems) | penabur-input-qa | Mobile multi-touch, combo buffering, cancellation and focus |
| [performance-optimization](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/c6ca6c41c839b68319ffc08430b99ab768debc32/skills/disciplines/performance-optimization) | penabur-performance | Performance and RGBA decode budgets on physical phones |

## How Codex uses the skills

- Codex discovers repository-local .agents/skills/<name>/SKILL.md (open the repository root as the workspace). The description is used for implicit activation.
- Explicit invocation examples: $penabur-art-qa, $penabur-game-feel, $penabur-input-qa, or $penabur-performance.
- AGENTS.md summarizes safe project boundaries; read it at the start of a coding session.
- If the branch is not checked out in Codex's local clone, it cannot see these new skill files yet. Fetch/check out this tooling branch **separately** from an active artwork worktree, or integrate after review. Never use destructive checkout/reset.

For comparison, upstream provides an optional official installer: npx skills add gamedev-skills/awesome-gamedev-agent-skills -a codex --list. We deliberately did not run this installer or inject all 79 skills into the user's machine. These adapters do not claim upstream's router is installed.

## Recommended immediate order

1. Use penabur-art-qa on Elton V3 and Ali V6 edge defects. Actual candidate PNGs and screenshots require a human visual verdict.
2. Use penabur-game-feel to inspect motion playback and contact readability, without changing engine attack windows.
3. Use penabur-input-qa for mobile gameplay regression and physical device handoff.
4. Use penabur-performance only after recording mobile FPS/memory baseline.

## Acceptance evidence

- CI test results on the exact candidate SHA, project skill discovery test, browser gameplay/atlas where relevant.
- Art review: full 36 Elton frames, both facings and all three playback rates, plus Ali Light3 F3–F6 and documented rights.
- No production art promotion, main merge, or production deployment without explicit owner approval.
