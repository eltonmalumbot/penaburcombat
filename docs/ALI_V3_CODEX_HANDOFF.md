# Ali Light Combo V3 — Binary Intake and Codex Handoff

**Status: REVIEW-ONLY, BLOCKED ON ART.** This branch is based on PR #14 (itself based on gamepad+VFX PR #13).

## Approved source and candidate
- Approved original Ali: `public/assets/fighters/ali.png`, SHA-256 `3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905`.
- Candidate V3: `PENABUR_Combat_Ali_Light_Combo_Cleanup_V3.zip` supplied in the project conversation; not yet in GitHub. Extracted pack includes `manifest.json`, `ali-combat-frames.png`, `frames/light1-00.png` through `frames/light3-05.png`.
- Candidate atlas: 4,320 × 1,620 RGBA; 18 frames, each 720 × 540. SHA-256 `6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a`.
- Light1/Light2: 0.35 seconds (startup .08, active .09, recovery .18). Light3: .39 seconds (.12, .09, .18).
- Light3 frames 4–5 still have missing body parts and clipped effects. Do not activate this candidate in the live game.

## Local verification commands
```bash
npm ci
npm run art:verify:v3
node scripts/verify-ali-v3.mjs --art-dir /absolute/path/to/extracted/Cleanup_V3 --repo .
npm test
npm run build
npm run test:e2e
npm run test:atlas
```

The first art command verifies only the tracked, text-based metadata contract. It **does not examine PNG bytes**. The second verifies the actual candidate atlas checksum, 18 frame checksums, RGBA dimensions, valid rectangles/pivots, nonlooping clip durations, and the original Ali PNG checksum. It prints `AUTOMATED_INTEGRITY_PASS__VISUAL_REVIEW_REQUIRED`, deliberately not art approval. The script never writes to the repo.

Without an approved repo checkout, the second command can omit `--repo` for candidate-only integrity; it cannot then verify the official Ali original.

## Integration gates
1. Reauthor Light3 F4/F5 with anatomically complete Ali, consistent face/outfit/ID, gloves, shoes, tech gear and effects within 720×540. Alpha-only cleanup cannot reconstruct anatomy.
2. Review every frame at production scale and both horizontal facings. Correct foot pivots and moving silhouettes; update hash manifest after any edit.
3. Transfer reviewed PNG bytes using a Git checkout/authorized upload, not the text-file API. Keep original `ali.png` intact.
4. Install new `ali-combat.png`, atlas v1 metadata, nonlooping clips and tests only **after approval**. Re-pin the artwork contract to the approved asset explicitly, not by disabling checks.
5. Run unit/build/E2E/atlas QA, confirm SonarCloud, Vercel Preview commit identity, and verify on real Android/iPhone.
6. Do not merge to `main` or deploy to production without owner visual approval.

## Scope for Codex
Implement **approved-art integration** on a dedicated branch/PR; do not invent replacement frame likenesses or claim incomplete candidate art is final. Keep damage, hitboxes, move balance, AI, meter, roster and game controls untouched. If supplied art fails manual quality checks, report exact frame defects and stop short of activation.
