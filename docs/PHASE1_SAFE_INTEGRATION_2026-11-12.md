# PENABUR Combat — Phase 1 safe integration audit (2026-11-12)

## Safety contract

- Production `main` remains at `a1b47ce32eec4022790ed4101ba42b1b9ca9b888` during this work.
- This branch starts from PR #26 head `80882191c511475f2a2e999e418f468057a3829a`.
- No force push, PR merge, binary promotion, approved-art overwrite or production deployment.
- This branch is **review-only**, and its PR should target `phase3a/ali-light3-v6-final-art-review` (PR #26), **not main**.
- The V6 Ali sprites are candidate art, not approved production assets. Elton still requires independently authored combat clips.
- GitHub mergeable status is not equivalent to passing the integration, art or release gates.

## Review scope

18 open PRs identified on 2026-11-12:
- #3: isolated older Alpha v0.3, diverged from main, NOT included.
- #8: standalone combat-time animation correction, NOT merged directly; a safety invariant is brought forward in this branch.
- #9: older Ali handoff branch from #8, NOT directly included.
- #11 and #12: independent gamepad and impact effects, both already integrated in #13. Do not merge again separately.
- #13: gamepad + VFX integration.
- #14 -> #15 -> #16: Ali V2/V3 review and candidate visual checks.
- #17: alternative V5 FX branch, not the parent of the current review stack. Do not merge blindly.
- #19 -> #20 -> #21 -> #22 -> #23 -> #24 -> #25 -> #26: current ordered stacked review chain, with #19 based on #16.
- #18 and #10 are release/art blocking issues, not completed delivery.

The current #26 branch is 151 commits ahead of main and has no commits behind main at the time of inspection; this is **not** evidence of artistic or release readiness. Several PRs are stacked and share cumulative changes; cherry-picking or merging every PR individually would duplicate or conflict with existing history. PR #3 is diverged from main and must be reviewed feature by feature, never wholesale merged.

## Integration sequence and gates

1. Preserve baseline: record refs, diff and checks for main, #8, #13, #16, #19–#26; keep #3 and #17 out of automatic merge.
2. Review the current #26 cumulative branch as the proposed integration baseline. Compare it with #8 and #3 for useful missing invariants, rather than applying their whole histories.
3. Gate any targeted code fixes with focused unit tests and browser QA; this phase adds attack-pose matching to prevent an unrelated/stale active attack from controlling authored frames or whole-sprite fallback motion.
4. Keep all V6 assets outside `public/`; keep the SHA-guarded manual review import. Do not activate Ali art by default without owner approval.
5. After CI and independent visual review, create a separate, explicitly approved integration candidate. Never assume a Draft PR's CI or mergeability approves production.
6. Review Ali F3→F4→F5→F6 at both orientations and 1×/0.5×/0.25×; inspect feet, gear, contact FX and likeness. Review all incomplete original clips, not only F4/F5.
7. Prepare a separate Elton animation package, with full identity/rights/provenance review, ground pivot, timing and both facings; until then the fallback is visibly temporary.
8. Validate Chromium unit/browser suites, Python sprite pipeline, GitHub Actions, SonarCloud, authenticated Vercel Preview and physical Android Chrome/iPhone Safari before considering release.
9. A production merge/deployment requires explicit owner approval.

## First targeted change: attack-pose clock and fallback gate

The latest review branch sampled `attack.elapsed` whenever a fighter's pose had an attack-like name and `fighter.attack` was non-null. If the attack's move/combo did not actually match that pose (for example a stale `light2` attack while displaying `light1`, or an interrupted attack while displaying `skill`), this could inadvertently time a different authored clip or animate a temporary lunge.

This branch computes the exact attack pose from move and combo and only applies combat-time sampling and fallback lunge if it matches the presented pose. For unassociated poses it retains `fighter.animationTime`; no game rules, hitboxes, damage or underlying fighter positions are changed. New Ali and Elton tests cover matched and mismatched attack clips, stale fallback and unrelated attack poses.

## Validation status

- Source code and tests committed to this review branch.
- GitHub-based diff and PR lineage audited.
- Tests have **not** been locally executed in this environment (remote git clone blocked by DNS). GitHub Actions/CI checks and browser/device verification must be observed separately; historical PR #26 results cannot be claimed for this new head.
- Existing documented #26 gate: Node 44, Python 9, gameplay browser 25, atlas/browser 27 previously passed on its historical head; owner art approval and physical-device QA remain outstanding.
