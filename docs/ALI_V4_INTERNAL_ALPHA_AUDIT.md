# Ali V4 — internal alpha hard-cut audit (2026-10-23)

**Status: REVIEW ONLY. These are automated warnings, not proof that artwork is bad or approved.**

Source checked: local extracted `PENABUR_Combat_Ali_Light_Combo_Repair_V4.zip`, SHA-256 of `ali-combat-frames.png` `b998f44db137f601617852e9fb7083a17c507839e60d562015fce8df4e660325`. The ZIP's own validator passes all 18 PNG sizes/hashes and 0.35 / 0.35 / 0.39 second Light Combo durations.

## Previously missed problem

The earlier V2/V3 studio only checked alpha near the **outermost 12 pixels of each 720x540 frame**. A hard compositing rectangle can appear **100 to 600 pixels inside** a frame, invisible to that edge check. V4 still has visibly abrupt alpha boundaries and some detached sprite fragments, especially in Light3 contact frames.

New code `public/review/alpha-seam-qa.js` calculates the number of pixels with alpha >32 for every column within each individual frame. It reports any adjacent-column occupancy change of at least 95 pixels. The review studio makes every affected frame navigable and overlays the column coordinate, including mirrored facing. The exported JSON includes coordinates.

## Actual V4 PNG audit

| Combo | Frame | Suspicious columns x (720px frame coordinates, jump in alpha pixels) |
|---|---|---|
| Light1 | 6 | x203 (+215) |
| Light2 | 3 | x506 (-205) |
| Light2 | 4 | x97 (+185) |
| Light2 | 5 | x177 (+130) |
| Light2 | 6 | x203 (+209) |
| Light3 | 3 | x106 (+120), x506 (-164) |
| Light3 | 4 | x610 (-95), x631 (-187) |
| Light3 | 5 | x582 (-120) |
| Light3 | 6 | x203 (+200) |

**9 / 18 frames flagged.** Some flagged transitions could reflect intentional composition or stylized silhouettes; the detector cannot tell anatomical defects from valid abrupt cutouts. Review against approved original Ali pose and adjacent frames before redrawing. Light3 F4 and F5 remain known high-priority manual blockers from direct visual inspection, regardless of automated warnings.

## Release decision

- **Do not** treat checksum + dimension success as HD animation approval.
- Open branch Vercel Preview at `/review/ali-combo-v2.html`, select the V4 PNG locally. The studio verifies exact SHA-256 *before* enabling the review, and warns about the actual suspect positions.
- Use the actual duel via `/?aliArtReview=v4` and inspect whether any cuts are noticeable at 1x speed, both facings, and after repeated Light taps.
- Reauthor/reassemble validated Light3 contact frames and any other confirmed defects; do not hide missing limbs with alpha masks or new effect bursts.
- Rebuild candidate atlas, update hashes/validators explicitly, run GitHub Actions and SonarCloud, then request owner art approval. **No production merge**.

The QA script is non-invasive, dependency-free, and does not alter sprites, engine, hitboxes, AI or inputs.
