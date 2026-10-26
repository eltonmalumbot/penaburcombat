# Combo Practice — dummy guard and unlimited meter (Draft)

**Development feature.** Extends playable Combo Practice in PR #22, without changing the original best-of-three VS CPU rules or approved sprites.

## In-game controls
After **START FIGHT → Ali or Elton → PRACTICE COMBOS**, two toggle buttons appear near the arena:

- **DUMMY: FREE / DUMMY: GUARD**: makes the passive opponent either stand normally or hold guard when able. A blocked Heavy still uses normal game rules and deals 3 chip damage instead of 16. Hit/damage HUD still counts the actual damage delivered.
- **METER: NORMAL / METER: ∞**: optional full-meter replenishment on every practice simulation step, allowing repeated Skill and Ultimate moves without grind. Move costs and attack frame timing are never reduced. Turning it off restores ordinary spending. Practice starts with both options OFF.
- **RESET DUMMY**: clears hit/damage stats and restores both fighters to strike range without changing the chosen toggles. It also restores full meter if infinite meter is active.

The toggles are outside the mobile D-pad and attack-button hit areas, and expose `aria-pressed` for accessibility. Both options disappear entirely in **FIGHT CPU**; setters are no-ops for VS matches.

## Quality / isolation
- Fixed-step combat engine remains 60Hz. Heavy/Skill/Ultimate damage, hitboxes, move durations, meter costs, AI in normal matches, and projectile/VFX code are unchanged.
- Unit regressions assert guarded Heavy chip damage vs unblocked Heavy; infinite-meter repeated Ultimates; resets preserve training toggle choices; normal VS ignores training setters and still requires appropriate meter.
- Browser regression asserts toggle states, genuine hit/damage, ready meter, normal VS separation, and visibility/no overflow on 360px phone viewport.
- This feature must pass GitHub Actions, TypeScript/build, SonarCloud and Vercel Preview before review. Real Android/iPhone QA remains separate.

**Artwork status:** Ali V5/V5.1 and Light3 F4/F5 in Issue #18 remain unapproved. This is gameplay implementation only, not final HD animation. Do not merge production without owner approval.
