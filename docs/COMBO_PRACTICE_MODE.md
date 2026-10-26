# Combo Practice Mode (reviewable gameplay feature)

**Draft gameplay feature — not production.** Makes the existing playable Ali/Elton experience better while the independently authored HD Light3 F4/F5 art remains blocked by Issue #18.

## Player workflow

1. Open the game, choose **START FIGHT**, then select Ali or Elton.
2. Select **PRACTICE COMBOS** instead of **FIGHT CPU**.
3. The CPU becomes a stationary non-attacking sparring dummy, initially in strike range. Normal movement, combo buffering, damage, hitboxes, input, meter and animation clock all continue to use the regular 60Hz CombatEngine.
4. Practice has **unlimited time and no round winner**. A knocked-out dummy regains health rather than ending the match. The live HUD shows accumulated valid hits and damage; **RESET DUMMY** restores both fighter positions, HP, meter, and counters.
5. Exit to character selection and choose **FIGHT CPU** to resume the original best-of-three, AI-enabled 90-second VS match.
6. Optional V3/V4/V5/V5.1 Ali local-art comparison still works if the special review query string is supplied. Neither mode activates unapproved image assets by default.

## Technical isolation and QA

- New `CombatEngine({practice:true})` opts into passive dummy, reset and endless clock; normal constructor behavior is unchanged. CPU override continues to work in engine-level fixtures.
- Read-only `mode` and `practiceStats` live on Match for rendering/status; the standard VS mode keeps the original combat win/time rules.
- Tests cover noncompetitive match persistence, real hit counts, damage totals, health restore, reset state, and unchanged normal timeout flow.
- Browser test enters Practice with Ali, confirms hits, resets, then verifies VS works without practice controls. No enemy AI or attack balance modifications in standard matches.

**Art limitation:** PR #21 V5.1 is FX-edge review-only, still has borrowed composite F5 leg. This PR introduces no new artwork or final authoring claims. Do not merge until owner reviews the stacked changes.
