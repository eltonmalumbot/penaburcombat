# Phase 3A combat presentation audit — 2026-10-22

Baseline: fetched `origin/main`, `a1b47ce32eec4022790ed4101ba42b1b9ca9b888`.
Inspected atlas loader/presentation, renderer, fighter types, engine, moves,
geometry, roster, both production PNG/JSON pairs, and unit/browser coverage.

## Artwork inventory (Ali and Elton)

Both approved PNGs contain eight 400×540 cells in a 1600×1080 atlas.
Visual inspection confirms stance/walking variations, not complete combat sequences.
The extra packed stance and walk cells are not substitutes for missing attacks.
Ali's outfit/equipment and Elton's floating screens also require continuity review
before enabling additional cells. Original PNGs and JSON metadata remain unchanged.

| Clip | Ali | Elton | Missing approved artwork |
| --- | --- | --- | --- |
| idle | PARTIAL | PARTIAL | Coherent breathing cycle; currently one static frame |
| walk | PARTIAL | PARTIAL | Continuity cleanup; currently 0,1,2,1 at 0.15s each |
| jump | FALLBACK | FALLBACK | Takeoff and rising silhouette |
| fall | FALLBACK | FALLBACK | Descending silhouette and landing reference |
| guard | FALLBACK | FALLBACK | Raised defensive arms and stable planted feet |
| light1 | FALLBACK | FALLBACK | First strike anticipation/contact/recovery |
| light2 | FALLBACK | FALLBACK | Distinct second strike anticipation/contact/recovery |
| light3 | FALLBACK | FALLBACK | Finisher anticipation/contact/recovery |
| heavy | FALLBACK | FALLBACK | Heavy anticipation/contact/recovery |
| skill | FALLBACK | FALLBACK | Fighter-specific action and recovery |
| ultimate | FALLBACK | FALLBACK | Fighter-specific high-impact action and recovery |
| hurt | FALLBACK | FALLBACK | Recoil and settling sequence |
| ko | FALLBACK | FALLBACK | Knockdown and held defeated pose |
| victory | FALLBACK | FALLBACK | Winning pose and optional settling sequence |

All missing-art integration is **BLOCKED** on additional approved source frames.
No new animation is classified COMPLETE. Existing HD idle/walk remain functional.
Elton was audited and exercises the shared pipeline; no Elton art was changed.

## Presentation change

Authored attack sampling now uses `fighter.attack.elapsed` when its move/combo
matches the displayed pose. The general pose clock can lag attack startup and can
retain its value across repeated identical attack poses. Sampling combat time
prevents a new strike from starting at an old recovery frame. Nonattack poses and
static pose boards still use `animationTime`. No engine modification was needed.
Synthetic tests deliberately disagree with the pose clock, verify restart and
final-frame hold, and check that rendering leaves the complete fighter unchanged.

Pose changes still reset the simulation's general animation clock. Missing clips
still select the first idle frame; hurt displacement, rotated KO staging and Canvas
effects remain explicitly temporary. Renderer scale/pivots, native-left mirroring,
DPR handling, safe areas, controls and reduced-motion behavior are unchanged.
Images are decoded once through the shared promise cache; failed loads are evicted.
No additional image loads or persistent per-frame caches were introduced.

## Art delivery specification

Deliver separate approved Ali/Elton transparent PNG source sequences and atlas v1
metadata, with provenance/permission and checksums. Preserve original anatomy,
outfit and equipment; no stretched or repurposed walk frames. Use untrimmed integer
crop rectangles, per-frame foot pivots inside each rectangle, native facing, and
the existing single fighter scale. Align the planted sole with logical floor 570
in both directions, including airborne and defeated-pose reference pivots.

Combat timing in seconds is authoritative and must remain unchanged:

| Clip | Startup | Active | Recovery | Total |
| --- | ---: | ---: | ---: | ---: |
| light1/light2 | .08 | .09 | .18 | .35 |
| light3 | .12 | .09 | .18 | .39 |
| heavy | .20 | .12 | .30 | .62 |
| skill | .23 | .14 | .29 | .66 |
| ultimate | .40 | .25 | .50 | 1.15 |

Provide distinct anticipation, contact and recovery keys for each strike. Export
frame durations that place contact at the active window; do not retime combat to
fit artwork. Attacks, hurt and KO use `loop:false` and hold their final frame.
Hurt can be interrupted by a new state; KO must settle into a grounded silhouette.
Idle/walk loop; jump/fall/guard/victory looping depends on delivered action design.
Review contact sheets and in-game playback on both facings before enabling clips.

## Validation and external gates

Local results are recorded in the accompanying PR description/setup report.
Chromium desktop and emulated mobile checks do not establish real Android/iPhone
performance or Safari compatibility. No measured 60 FPS claim is made.
GitHub API access currently returns Forbidden, so Actions, SonarCloud and Vercel
preview identity cannot yet be independently verified. Do not merge until those
checks and the required visual review pass. No production deployment was requested.
