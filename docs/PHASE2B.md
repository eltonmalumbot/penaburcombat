# Phase 2B — temporary HD combat presentation

The approved PNGs and all atlas metadata are unchanged. Idle/walk still sample their real clips. `sampleFrame` continues returning null for absent clips; `spritePresentation` explicitly records `temporary: true` and uses the first idle cutout. Adding an authored clip automatically supersedes this temporary presentation.

| Missing pose | Temporary presentation |
| --- | --- |
| Jump / fall | Stable cutout follows the engine's actual airborne position; no invented limb motion |
| Guard | Stable cutout with a forward shield arc |
| Light 1–3 / heavy | Stable cutout plus a forward energy arc; intensity follows real startup/active/recovery |
| Skill / ultimate | Same cutout and attack arc plus a character-colored ring |
| Hurt | Five-pixel recoil offset and separate impact cross |
| KO | Entire cutout rotated onto its side, with its opaque silhouette resting on the ground (bounds measured once at load) |
| Victory | Upright cutout with gold halo |

These are readable temporary cues, **not finished attack, collapse, or celebration animation**. No limbs are redrawn, no faces are altered, no body proportions are stretched, and no blur or crossfade hides missing artwork. Arms do not physically extend to the attack arc. KO is a rigid cutout, not a natural fall. Idle-to-walk silhouette and source accessory differences remain. Proper approved contact, recoil, airborne, guard, KO and victory frames are still needed for both fighters.

Renderer transforms never write fighter state. Facing mirrors the entire image consistently, while effects face the opponent independently of atlas source orientation. Grounded temporary poses preserve the existing foot pivot; jump/fall follow engine y. Geometric rendering remains available during missing/failed loads and preserves the existing retry behavior. Combat mechanics, branding and independent-project disclaimer are unchanged.

Validation includes unchanged original PNG checksum tests, pure presentation tests, browser assertions that all twelve missing poses in both directions draw one sprite and zero geometric body rectangles, original sprite pivot/facing tests, approved-art pose board screenshots, complete desktop/mobile matches, and forced failed-load fallback. `npm run test:atlas` writes Ali/Elton pose-board PNGs to its Playwright output directory. These render tests are separate from the production gameplay suite.

Publication remains gated on deployed gameplay verification. A successful Vercel build alone does not establish authenticated preview access or successful gameplay.
