# PENABUR Combat — Ali Light Combo V2 visual acceptance gate

**Status:** review-only candidate. Not production-approved. This branch starts from `integration/gamepad-v2-combat-vfx` (PR #13), and preserves the original approved `ali.png` and `ali.json` unchanged.

## Inspect the actual candidate

1. Open `/review/ali-combo-v2.html` on this branch's Vercel Preview.
2. Download and extract the previously prepared `PENABUR_Combat_Ali_Light_Combo_Art_Pack_V2.zip` from the project conversation.
3. In the review page select **ali-combat-frames.png**. It is processed **only in your browser**, never sent to the server. The review page checks the 4,320 × 1,620 PNG dimensions and the exact SHA-256 `1e206d68e0a20ee55ba99af18e09ab5ef856ad0d0ea10cb766588d2351fcf7e6`.
4. Compare to the real, GitHub-approved first Ali idle frame loaded from `/assets/fighters/ali.png`. Play Light 1/2/3 at 0.5×, 1×, and 1.5×. Review both facings and the ground reference line.
5. Export the JSON notes for each frame requiring correction. **Checking boxes is not an approval or deployment mechanism**.

The source pack's automated Pillow validator passes 18 frame dimensions, file hashes, zero-alpha outermost border, and clip timing, but this does not certify physical image quality.

## Measured art defects on V2 pack

Direct pixel review of the **rightmost 12 px** of every 720 × 540 candidate frame (alpha > 4) found:

| Candidate frame | Nonzero near-edge pixels | Meaning |
| --- | ---: | --- |
| Light 1 — F4 | 1,107 | Cyan hit burst/trail reaches the right frame edge. |
| Light 2 — F4 | 859 | Cyan hit burst/trail reaches the right frame edge. |
| All other candidate frames | Below the 100-pixel warning threshold | **Not proof of artistic quality.** Manual limb, ID card, body and frame continuity review still required. |

This detects a previously missed limitation of the original strict outermost-alpha-border test. The original user-provided character reference PNG hash differs from the GitHub-approved `ali.png` bytes: do **not** replace the existing repository image with the uploaded reference.

## Animation contract

- Each Light 1 and Light 2 lasts 0.35 seconds (0.08 startup, 0.09 active, 0.18 recovery).
- Light 3 lasts 0.39 seconds (0.12 startup, 0.09 active, 0.18 recovery).
- Each has six source frames, authored as a non-looping clip, and the final pose holds after completion.
- The review page loops by default **only for visual inspection**, not gameplay.

## Production gates (still open)

- [ ] Regenerate/fix frame edges and artifacts; compare against approved Ali identity (face, shirt, badge, backpack, gloves, shoes).
- [ ] Confirm actual foot pivots and frame-to-frame continuity on both facings.
- [ ] Transfer reviewed binary PNG source to a protected feature branch in a supported toolchain; do **not** point `ali.json` to a nonexistent image.
- [ ] Stage metadata matching engine attack time on the reviewed branch.
- [ ] Run `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:atlas` with full source bytes and real gameplay.
- [ ] Confirm matching Vercel Preview SHA, SonarCloud, and actual Android/iOS gameplay.
- [ ] Explicit art/UX approval before merge. Elton remains a separate animation workstream.

No merge/deploy of the unfinished Ali combat art is authorized by this review PR. The approved idle/walk art and combat engine are untouched.

## V3 alpha-cleanup candidate (2026-10-23) — STILL BLOCKED

A new local ZIP, `PENABUR_Combat_Ali_Light_Combo_Cleanup_V3.zip`, was built from the V2 source. The preview inspector now accepts **both** atlas digests and labels the chosen edition. V3's SHA-256 is `6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a`, also 4320 × 1620 RGBA.

- All 18 frames and the combined atlas were rebuilt and validated; character RGB pixels were unchanged. Cleanup consists solely of localized alpha edits.
- Light1 F4 and Light2 F4: remove disconnected neighboring shoe at the right and feather truncated blue hit effects.
- Light3 F2–F5: remove confirmed neighbor shoe/body remnants and smooth obvious edge truncations where possible.
- The package validator passes PNG hashes, dimensions, frame insets, clip durations, source pivot metadata and quarantined neighbor regions.

**Critical blocker:** Light3 F4/F5 still have missing portions of Ali's lower body and large pre-trimmed blue effects from the original generated source. Alpha masking cannot recreate limbs or reconstruct original character identity. Therefore V3 is an improved *candidate* only, not a production-ready 18-frame HD animation.

Do not alter `public/assets/fighters/ali.json` or merge the candidate until new fully authored keyframes pass both-direction visual QA and the binary atlas is installed in a suitable review branch. Preserve existing working Ali idle/walk and game rules.
