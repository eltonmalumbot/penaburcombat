# Combat Impact VFX — Phase 3C candidate

This is **visual polish only**. It does not change match state, damage, AI, attack startup/active/recovery, meter, input, collision, fighter art, or any character unlock.

- Confirmed hits show a brief expanding double-ring, radial streaks, and a small HIT! label.
- Guarded hits show a shield arc and BLOCK label instead.
- Cues are bounded to 10 concurrent impacts and expire in under a third of a second.
- They advance only during unpaused frames. Existing game pause freezes the effect clock.
- The renderer respects `prefers-reduced-motion: reduce` by skipping the additional effects.
- The original spark system and screen shake remain; no new image, font or sound downloads.

Verification: `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:atlas`. Review an actual Ali-versus-Elton hit/block in the Vercel Preview on phone landscape; confirm that UI and fighters are not obscured.

This branch is independent of Mobile Gamepad V2 PR #11 and pending Ali HD art PRs #8/#9. Do not merge until CI, SonarCloud, Vercel SHA, and visual usability review pass.