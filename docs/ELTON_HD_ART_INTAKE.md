# Elton HD Attack Art — Review-Only Intake Contract

Updated 2026-11-12. This branch is stacked atop PR #28, which is stacked atop PR #27 and PR #26. **No production assets are modified.**

## Why this pipeline exists

Elton's approved public atlas provides only idle/walk poses. Light1–3, Heavy, Skill, and Ultimate still use temporary full-cutout motion. Do not mislabel that motion as independently authored HD frames.

`scripts/elton_art_pipeline.py` validates and packages **36 independently authored review frames** into a transparent `4320×3240` combat-only candidate atlas. It does not install PNGs into `public/`, alter `elton.json`, update the renderer, or authorize deployment. PNG creation and artistic review happen separately.

## Source contract

Create a local directory at **`.local-art/elton-input/`**, which is explicitly excluded by `.gitignore` and is never published:

```text
.local-art/elton-input/
  frames/
    light1-00.png ... light1-05.png
    light2-00.png ... light2-05.png
    light3-00.png ... light3-05.png
    heavy-00.png ... heavy-05.png
    skill-00.png ... skill-05.png
    ultimate-00.png ... ultimate-05.png
```

All 36 files must be **PNG RGBA 720×540**, facing right, with a clear 4 px transparent perimeter. Keep a continuous original Elton identity from the already approved `public/assets/fighters/elton.png`: clothing, face, proportions, accessories, footwear. All poses are full-body with both legs and shoes, not duplicated or composited fragments. The logical foot/pivot anchor is `(320,525)`, with ground silhouette approximately between y=505 and y=535. Use six **distinct** poses per move and never add external brand logos.

Rows in the candidate atlas: `light1, light2, light3, heavy, skill, ultimate`. Columns are poses 00–05. Each move has two startup frames, two active/contact frames, two recovery frames. Duration list in seconds:

| Move | Durations (6 frames) | Startup / Active / Recovery |
| --- | --- | --- |
| light1, light2 | .04,.04,.045,.045,.09,.09 | .08/.09/.18 |
| light3 | .06,.06,.045,.045,.09,.09 | .12/.09/.18 |
| heavy | .10,.10,.06,.06,.15,.15 | .20/.12/.30 |
| skill | .115,.115,.07,.07,.145,.145 | .23/.14/.29 |
| ultimate | .20,.20,.125,.125,.25,.25 | .40/.25/.50 |

These match existing `src/game/moves.ts`. Do not change any gameplay stats, hitboxes, or combat timings for art alignment.

## Build and verification (local Python 3.12 + Pillow 11.3)

```bash
python -m pip install Pillow==11.3.0
# Copy the 36 PNG files into .local-art/elton-input/frames/
# Create .local-art/elton-input/provenance.json as shown below.
python scripts/elton_art_pipeline.py
```

Create the following local-only file before running (do not commit it):

```json
{
  "artistProvenance": "Who authored these frames and which tools were used",
  "usagePermissionNote": "Document permission for local review; production use still requires approval"
}
```

The command automatically verifies the generated candidate, creates a fresh OS temporary directory `elton-hd-review-*`, and prints its location. Source assets must be copied to the fixed Git-ignored inbox before running. The CLI deliberately accepts **no arguments**. All art and provenance inputs come from the fixed gitignored folder to avoid arbitrary filesystem access.

Every PNG receives a SHA-256; the output includes `manifest.json`, `frames/`, and `elton-combat-frames.png`. The validator checks the pinned approved Elton source SHA, exact pixels, dimensions, alpha coverage/margins, required timings, duplicate poses per move and review-only flags. A pass is **technical integrity only**, not art or usage approval.

## Next release gates

1. Artist/Codex produces real distinct PNGs using the approved reference, with explicit provenance.
2. Inspect each pose's anatomy, gear and face consistency; compare transitions for both left/right on transparent checkerboard, especially attack contact and planted feet.
3. Add a **local-only, checksum-guarded Elton reviewer** analogous to the existing Ali V6 opt-in UI, with tests; do not copy candidates into `public/`.
4. Check Vercel preview/head SHA and actual gameplay on browser, then physical Android Chrome and iPhone Safari.
5. Only after explicit owner signoff may a separate PR propose a production asset update. Never merge to `main` or deploy production without approval.

## CI

`python -m unittest discover -s tests -p 'test_elton_art_pipeline.py' -v` tests the real builder and validator using **synthetic** fixtures. No synthetic fighter art is shipped, enabled or passed off as Elton's approved artwork.

## Offline review output

The pipeline also writes `two-facings.png` and `review.html` beside its verified
candidate, outside the checkout. The comparison sheet shows all 36 poses at half
scale, both facings, with ground and pivot guides. The reviewer opens locally in
Chromium, requires manual selection of the exact generated atlas, verifies its
SHA-256 before decoding, and supports frame stepping plus nonlooping 1×/.5×/.25×
playback. It has no network access or connection to the game. Reset and rejected
files clear the canvas; a rejected candidate cannot keep playing the prior art.
The checksum is pinned into the generated HTML, so keep that HTML with its
original verified package. This protects against selecting the wrong PNG; it is
not an artist identity, authenticity, or approval certificate.

Exact duplicate decoded poses now fail across **all** six moves, in both builder
and verifier. Similar poses, damaged anatomy, identity drift, sliding feet and
bad motion still require visual review. Synthetic browser fixtures test this
reviewer's controls and rejection behavior; they are not actual Elton artwork.

## V3 polish preserving V2

Keep the original V2 directory and ZIP unchanged. Use a separate local copy
at `.local-art/elton-v3-work/frames/` with its own `provenance.json`.
`python scripts/elton_v3_review.py` accepts no arguments and verifies the pinned
V2 atlas and ZIP before using the existing builder on that fixed V3 workspace.
It creates a fresh review-only package with `candidateEdition: V3`,
`two-facings-v3.png`, `v2-v3-comparison.png` and `revisions-v3.json`.
Comparison rows per move are V2-right, V3-right, V2-left and V3-left.
Sole-band centroids help inspect registration; they do not certify anatomy.

Keep full frames, provenance and ZIPs local. Lightweight contact-sheet PNGs
and `REPORT-V3.md` under `art-review/elton-hd-v3/` support independent review
without uploading the large ZIP; they remain outside production assets.
Review all six poses at 1x/.5x/.25x in both directions. Heavy F02 must show
contact and recovery should retract progressively, preserving combat timing.
Document Ali F3/F6 edge defects separately; keep Ali artwork unchanged.
