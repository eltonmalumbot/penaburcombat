# Phase 3A — Ali Light3 F4/F5 artist handoff (review only)

**Release blocker:** Ali `light3-03.png` (fourth frame) and `light3-04.png` (fifth frame) still contain incomplete art and abrupt blue-energy boundaries. V5 F5 is a composited workaround, not independently authored anatomy. See [art issue #18](https://github.com/eltonmalumbot/penaburcombat/issues/18).

## Exact accepted source

- Existing extracted ZIP: `PENABUR_Combat_Ali_FX_Polish_V5.zip`. Its 4320×1620 RGBA candidate atlas SHA-256 must equal `43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521`.
- Two newly authored replacement `light3-03.png` and `light3-04.png`: each untrimmed 720×540 RGBA, with safe transparent perimeter (4px) and feet aligned to pivot **(320,525)**. Do not paste the missing shoe from an earlier frame.
- Identity must match the **GitHub-approved** Ali original `public/assets/fighters/ali.png`: dark short hair, blue rolled-sleeve shirt, hanging ID badge, glowing backpack, dark gadget pants, fingerless gloves, white/blue shoes.
- Frame 4: contact of forward palm strike, full body visible and cyan FX not rectangularly cropped. Frame 5: independent full-body follow-through with both feet, natural stance.
- Native facing screen-right; editor must inspect mirrored left-facing playback.
- No damage, hitbox, move timing, AI, meter, controls or character roster changes.

## Build a V6 review-only atlas after artwork is delivered

Requires Python 3 and Pillow. In a separate working directory (never `main`):

```bash
python scripts/ali_light3_rebuild.py \
  --source-v5 /path/to/extracted/PENABUR_Combat_Ali_FX_Polish_V5 \
  --frame4 /path/to/new/light3-03.png \
  --frame5 /path/to/new/light3-04.png \
  --output /tmp/Ali_Light3_V6_Candidate \
  --artist-provenance "Artist name, asset rights and reference design"

python scripts/ali_light3_validate.py --root /tmp/Ali_Light3_V6_Candidate
```

The first script refuses source/checksum drift, cloned source poses, incorrect dimensions/transparency, ungrounded feet and existing output folders. It writes all 18 PNGs with an exact pixel-assembled atlas and a **not-approved** manifest. The second script verifies exact pixels, every frame SHA and each attack duration. **Neither script replaces the PNGs in GitHub or grants art approval.**

The companion user-downloadable `Ali_Light3_F4_F5_Redraw_Handoff.zip` from the project conversation contains references, visual ground-pivot guide, and locally verified rebuild/negative-test scripts. The ZIP is not uploaded to GitHub.

## Acceptance before integration

- [ ] Artist or authorized asset-generation workflow supplies **two independent actual RGBA PNG keyframes**.
- [ ] Source provenance/license and identity verified.
- [ ] Smooth Light3 F3→F4→F5→F6 in both facings; boots and hands never cut, FX edges smooth and feet remain grounded.
- [ ] Rebuilt V6 atlas passes SHA/PNG/timing integrity; 16 original frames unchanged.
- [ ] Binary source imported through Git checkout/approved upload on its own art PR and visually reviewed in real duel.
- [ ] `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:atlas`, SonarCloud and Vercel Preview pass.
- [ ] Real Android Chrome/iPhone Safari checks and explicit visual approval before any `main` merge.

**Important:** This PR ships only code/tooling and docs; new artwork has not been delivered, approved or activated.
