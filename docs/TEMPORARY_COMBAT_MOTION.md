# Ali & Elton: authored-clock fallback combat motion (review branch)

**Purpose:** Make missing attack clips look less like frozen idle cutouts **while waiting for actual independently authored 720×540 HD combat frames**. This is an in-game visual improvement, not a replacement for artwork; original Ali and Elton PNG/JSON bytes are unchanged.

## What players see

On both Ali and Elton in real VS CPU and Practice Combo modes, attacks whose HD clips are **not** present now have three deterministic, combat-clock-timed *presentation beats*:

1. **Startup:** a small anticipatory lean backward as the engine's original startup window passes.
2. **Contact:** a short forward lunge around the fighter's grounded sprite pivot with a punch-forward tilt, synchronized to the existing active/hitbox window.
3. **Recovery:** eased recoil back to neutral during the original move recovery frames.

Heavy, Light 1–3, Skill and Ultimate have restrained forward amounts tuned for readability. Temporary FX and real hit sparks remain active. The renderer still draws the approved original fighter atlas pixels; **no synthesized faces, limbs, V5 composite or alternate art assets are introduced**. The motion is achieved solely through translation/rotation of the whole idle cutout. It therefore remains a prototype visual cue, not true limb animation or HD combat artwork.

## Implementation guardrails

- The motion function exists in `src/animation/presentation.ts` (pure calculation). It reads existing `fighter.attack.elapsed` and `moveData` phase windows. No combat engine state or cooldown/hitbox/damage/meter/AI inputs are read from rendered offsets.
- `drawFighter` already applies presentation offsets/rotation to the sprite around its ground pivot, and mirrors by facing; no duplicate drawing pipeline is needed.
- **Authored clip always wins:** if a real attack clip exists in an atlas—including a checksum-verified local Ali review pack—it is rendered untransformed. When the source clip is absent, the temporary effect is applied. If there is no live attack, old unchanged fallback applies.
- Lightweight translations/rotations avoid decoded bitmap copies, allocation of new PNGs, WebGL or network operations. No new art binaries are committed.
- Unit tests assert startup/contact/recovery phases, invariant ground pivot and original fighter state, and that an authored synthetic attack remains untransformed.
- Browser test verifies that actual approved Ali and Elton PNG sources render one time only for both facings with nonzero contact lunge and no fighter-state mutation. Existing atlas/pose and replay tests remain authoritative.

## Approval gate

Keep PR Draft and stacked atop PR #23. The final Ali F4/F5 redraw remains tracked in Issue #18; Elton needs genuine authored strike/skill/ultimate frames. The new motion is **not** art signoff or a reason to merge unapproved sprite candidates into production. Real Android/iOS and owner visual inspection must still happen.
