# Phase 2 (review-only): Ali and Elton temporary motion continuity

Date: 2026-11-12. Based on Phase 1 safe integration branch, which itself is stacked on draft PR #26.

## Visual issue fixed

Temporary whole-cutout attacks previously used:
- startup: eased displacement `0 → -7` and rotation `0 → +0.025`;
- active: immediate displacement `+strength` and rotation `-0.048`;
- recovery: eased displacement `+strength → 0` and rotation `-0.048 → 0`.

At startup-to-active, the cutout abruptly jumped from `-7` to `+13..28`, while rotation flipped. This was visible in both Ali and Elton where authored combat sprites are missing.

The first 30% of the active phase now smoothly interpolates from the startup endpoint to the active strike pose, and the transient contact pulse remains. At the active-to-recovery boundary, the pose already matches the recovery entry. Attack durations, contact windows and `moveData` are unchanged.

## Shared pose ownership

The exported `presentingAttack(fighter)` helper matches the active attack's move/combination to the displayed fighter pose. Both sprite presentation and temporary Canvas strike VFX use this same rule. A stale or interrupted attack must not decorate a hurt/guard/unrelated combo pose with attack effects.

## Automated checks added

- Both Ali and Elton, each facing, all three light-combo strikes plus Heavy, Skill and Ultimate.
- Tight displacement/rotation continuity tolerance at start, startup→active, active→recovery and final recovery.
- No fighter position/foot anchor mutation or approved sprite replacements.
- Matching vs mismatching strike/VFX ownership, including interrupt, ultimate and null attack.

CI is authoritative for the branch; do not assume previous PR results cover this new code.

## Unfinished work and release gates

- These are presentation-only *temporary cutout motions*; they are **not new independently authored HD attack sprites**.
- Ali V6 F4/F5 needs visual/identity approval and final F3–F6 continuity confirmation in both facings.
- Elton still needs full independently authored Light 1–3, Heavy, Skill and Ultimate sprites with reviewed provenance.
- Existing candidate art stays outside `public/`; no default asset activation.
- Full browser gamepad and gameplay QA, physical mobile tests, owner artwork approval, and explicit production authorization remain required.
- No merge to `main`, production release, or automatic promotion is authorized by this branch.
