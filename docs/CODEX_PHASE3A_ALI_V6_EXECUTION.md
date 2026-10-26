# Codex execution brief — Phase 3A: Ali Light3 F4/F5 final HD artwork

**Scope:** Deliver independently authored HD replacement frames and a verifiable **review-only** V6 asset package for Ali's third light attack. Never claim code-generated transformations of the old cutout are hand-authored finished anatomy.

## Baseline (verified 2026-10-26)

- Repo: `eltonmalumbot/penaburcombat`. Production branch: `main`.
- Active review stack: Draft PR #22 (practice) → Draft PR #23 (guard/meter) → Draft PR #24 (fallback strike presentation) → Draft PR #25 (bidirectional art QA). All remain **unmerged**.
- PR #25 branch: `phase3a/ali-light3-bidirectional-review-qa`, initial QA commit `ff2089442ff79377c01b22dd34654b61503f9201`. GitHub Actions for this commit: success.
- Track actual asset defect in Issue #18. The original approved Ali sprite is `public/assets/fighters/ali.png`; **do not replace it**.
- A V5 art pack is referenced by `docs/ALI_LIGHT3_F4_F5_ARTIST_HANDOFF.md`, but the V5 binary ZIP and independent F4/F5 replacements are **not stored in the repository**. The original conversation referenced `PENABUR_Combat_Ali_FX_Polish_V5.zip` and `Ali_Light3_F4_F5_Redraw_Handoff.zip`; verify access or obtain them from the owner. **Never invent or silently reconstruct missing source bytes.**
- Source V5 atlas SHA-256: `43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521`.

## Instructions to coding/asset agent

1. Checkout the exact latest head of Draft PR #25 (not an arbitrary `main`), read Issue #18 and these contracts:
   - `docs/ALI_LIGHT3_F4_F5_ARTIST_HANDOFF.md`
   - `docs/ALI_LIGHT3_BIDIRECTIONAL_QA.md`
   - `docs/PHASE3A_READINESS.md`
   - `public/assets/fighters/README.md`
   - `src/animation/review-ali.ts` and `src/animation/presentation.ts`
2. Create a **new child branch** such as `phase3a/ali-light3-v6-final-art-review` from current PR #25 head. Do not rewrite its history.
3. Obtain the original V5 pack, provenance/permission details, and truly independent replacement PNGs. If any are unavailable, **stop short of asset integration** and provide a precise inventory of missing source bytes, SHA checks, and artist tasks. Do code-only validation improvements separately, if meaningful; do not forge assets or claim completion.
4. Required replacement files:
   - `light3-03.png` (F4: original forward-palm contact pose, complete body/anatomy, cyan FX fully within canvas).
   - `light3-04.png` (F5: distinct original follow-through, complete legs and both shoes; not masked, cloned or recomposited F3/F4/V5).
   - Both exactly **720×540 PNG RGBA**, native facing right, untrimmed, with 4px transparent perimeter, planted ground aligned around pivot **(320,525)**.
   - Preserve approved Ali likeness: black textured hair, blue rolled-sleeve uniform, ID badge, tactical/glowing backpack, dark gadget pants, gloves, blue-white sneakers.
   - Compare actual transitions F3→F4→F5→F6 right-facing and left-facing; no missing shoes, cut-off palms, teleports, accidental horizontal flips, abrupt cyan FX rectangles or alpha seams.
5. Rebuild V6 **review-only** (never auto-install into production) with the existing tools:
   ```bash
   python scripts/ali_light3_rebuild.py --source-v5 /ABS/PATH/TO/VERIFIED_V5 \
     --frame4 /ABS/PATH/light3-03.png --frame5 /ABS/PATH/light3-04.png \
     --artist-provenance "Verified artist/source name, license and usage permission"
   python scripts/ali_light3_validate.py --root /tmp/ali-light3-review-OUTPUT_FROM_REBUILD
   python scripts/ali_light3_review_sheet.py --root /tmp/ali-light3-review-OUTPUT_FROM_REBUILD \
     --output /tmp/ali-light3-v6-two-facings.png
   ```
   Keep the existing 16 frames bitwise intact; preserve Light3 timing **0.05+0.04+0.03+0.045+0.045+0.18 = 0.39 seconds**. Never weaken checksum validation, swap frame IDs or edit gameplay logic to mask animation artifacts.
6. If actual asset inputs are available: review V6 in an **opt-in local preview** (no hidden runtime override), at full speed and .5×/.25×, right/left facing, and both VS CPU and Practice Combo. Save screenshots/visual findings and a provenance trail. Require explicit **human artwork signoff** before any production art activation.
7. Run validation:
   ```bash
   npm ci
   python -m unittest discover -s tests -p 'test_ali_light3_pipeline.py' -v
   npm run check
   npm run test:e2e
   npm run test:atlas
   ```
   Then inspect GitHub Actions, SonarCloud, Vercel Preview with head SHA/build-info match, and real Android Chrome/iPhone Safari QA. If real hardware is unavailable, record it as **unverified**.
8. Submit a separate **Draft PR** stacked atop PR #25. Include: exact source/target checksums, changed-frame list, real asset evidence, before/after comparison, mirrored-frame screenshots, CI results, remaining risks and release blockers. **Do not merge any stacked PR or deploy to production** without owner approval.

## Non-negotiable invariants

- Do not change `src/game/moves.ts`, `src/game/geometry.ts`, AI, hitboxes, damage, HP, meter, round logic, controls or fighter roster to accommodate art.
- Keep approved `public/assets/fighters/ali.png` and Elton artwork byte-identical.
- Temporary whole-sprite anticipation/lunge from PR #24 is visual fallback only. It is not independently authored HD combat artwork.
- All unapproved V6 PNGs stay preview-only. Checksum success certifies file integrity, **not visual/artistic approval**.

## Required final report

Report separately **code completed**, **actual art received/verified**, **in-game art review**, **CI**, **Vercel Preview**, **human review**, **real-device QA**, **Draft PR URL**, and **blocked items**. Do not report Phase 3A as complete unless each gate is explicitly satisfied.
