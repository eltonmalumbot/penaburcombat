# Ali Light3 V6 audit — 2026-10-23

## Reviewed branches

| PR | Audited head | Finding |
| --- | --- | --- |
| #13 | `467a1e130af23fb3f8053f518240e1cba880ede9` | Draft combined gamepad/VFX branch; authored strikes sample combat elapsed time. No new approved combat artwork. |
| #16 | `efeb95a89fa375c75ee712defb00d337a0f7c31f` | Draft opt-in, checksum-gated V3/V4/V5 local review. V5 is FX cleanup and retains the composited lower leg; not final art. |
| #19 | `239dcbf115f02f82d8db593d046ca3c665bb3582` | Draft V6 rebuild/validator with synthetic Python tests. No actual F4/F5 replacements supplied. |

All three exact heads reported successful GitHub build, SonarCloud analysis and
Vercel deployment statuses when audited. These upstream statuses do not certify
artwork or checks on a new commit. PR #19's Sonar comment also reports its quality
gate passed with zero new issues. Direct retrieval of its known Preview's
`/build-info.json` was blocked by the execution proxy (CONNECT 403), so this audit
cannot independently confirm that deployment's runtime SHA from that request.

## Explicit artwork blocker (Issue #18)

No independently authored `light3-03.png` / `light3-04.png` was found in the
repository or the available workspace attachments. The source V5 ZIP and the
conversation handoff ZIP are also absent from this workspace. References in an
issue/comment are not delivered source files. Therefore no genuine V6 candidate
can be rebuilt or visually accepted in this task; all executed art tests use
synthetic fixtures, isolated under temporary directories.

Required: two independent 720×540 untrimmed transparent RGBA PNGs, native facing
right, 4px transparent safe inset, pivot (320,525), full shoes and consistent
Ali anatomy/outfit. F4 is complete forward-palm contact with contained cyan FX;
F5 is complete follow-through with independently authored legs. Review
F3→F4→F5→F6 in both directions, at 0.25× and 1×, before owner approval. No V5
composite, clone, alpha-only edit or poster is accepted as final replacement art.

Approved `public/assets/fighters/ali.png` SHA-256 was independently checked:
`3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905`.
Production PNGs/metadata remain untouched. Elton receives no artwork changes.

## Confirmed pipeline defect and repair

The PR #19 validator checked only summed clip duration. A manifest could move time
between keyframes, reorder F4/F5 (whose durations are equal), or use NaN duration
while retaining an accepted total check. The rebuilder checked `clipTiming` but
not the actual `clips` entries it copied to the candidate. Regression cases
reproduced these gaps before the fix.

Both source intake and candidate validation now use one strict check for six
ordered frame IDs, nonlooping mode, exact per-frame durations and matching
`clipTiming`. Light3 remains **.05 + .04 + .03 + .045 + .045 + .18 = .39s**;
Light1/2 stay .35s. Nonfinite durations fail the exact comparison. The standalone
validator imports the read-only check from the sibling rebuild module; keep both
scripts together when distributing the handoff. No artwork is created by this
check, and the candidate manifest remains explicitly unapproved.

This is stacked on PR #19, not a merge of all newer PR #13 changes. The inherited
PR #13 history already removed the .05s light-buffer threshold relative to main;
that pre-existing engine change is not introduced or modified here. This branch
has **no delta to `src/game`, controls, renderer, or production assets** relative
to the audited PR #19 head.

## Validation and release limits

Run Node 24, `npm ci`, then `npm test`, `npm run build`, `npm run test:e2e`,
`npm run test:atlas`. Use system Chromium via
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` in this environment.
Run Python 3.12 with binary-only `Pillow==11.3.0` and:

```sh
python -m unittest discover -s tests -p 'test_ali_light3_pipeline.py' -v
```

The two new test cases exercise source and candidate checks against same-total
retiming, NaN, swapped contact/follow-through IDs and inconsistent timing metadata.
Existing cases still exercise atlas assembly, other 16 frames unchanged,
source integrity, invalid/clone art, provenance and checksum/timing failures.
Execution results and new-commit external checks are recorded in the Draft PR.

No real artwork integration, Android/iPhone hardware QA, measured FPS, production
deploy or merge is claimed. Keep Draft while Issue #18 artwork remains missing.
