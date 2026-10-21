# Phase 2: partial atlas review

## Scope and permission boundary

Audit baseline: `main` at `d7d0c1c2f55dbb1764077b14a8f8626259efad56`, fetched before inspection. The supplied review pack targets that same commit. Its README and Phase 2 prompt explicitly mark its human-inspired art as review-only; permission to publish that art has not been supplied.

All supplied PNGs, JSON metadata, source sheets, and screenshots remain outside the checkout. Local Chromium intercepts same-origin atlas requests and supplies private files to the existing `atlasUrl` hook. The hook is changed only in that local browser's memory. No art is copied to `public/`, no default roster atlas URL is enabled, and no review artwork is included in this PR or production bundle. The automated public tests use abstract colored rectangles only.

## Code audit and fixes

- Missing pose clips previously substituted `idle`, hiding jump, guard, attack, hurt and KO state. The sampler now returns no frame for an unsupported pose; the renderer draws the original geometric animation for exactly that pose. This preserves combat feedback while art remains incomplete.
- The renderer disabled smoothing for every atlas. Version-1 metadata now supports `sampling: "smooth"` (default, HD illustration) or `"pixelated"`, plus `facing: "right"` (default) or `"left"`. The existing pack is compatible without modification. Drawing restores transform/filter state after each fighter.
- A failed bounds check evicted the JavaScript promise, but the browser could still reuse the old, decoded image on retry. Image bytes now revalidate before decoding; temporary Blob URLs are revoked. A corrected image can actually recover.
- Atlas preparation now swaps a matchup together and ignores superseded preparations. Clearing an atlas URL restores the placeholder rather than keeping stale art.
- No fighting engine, roster, damage, hitboxes, AI, input or timing files are changed. Pose clocks still reset on the engine's pose transition; clip sampling is not coupled to FPS.

## Local asset measurements

Each atlas is **1600×1080 RGBA**, with eight **400×540** rectangles, four idle frames at **0.18 s** and four walk frames at **0.115 s**. Both decode and pass version-1 metadata/frame bounds checks. Fully transparent pixels occupy **63.99%** of Ali's sheet and **64.92%** of Elton's. All sixteen frames contain visible pixels and valid pivots/references.

Measurements below use the bounding box of alpha ≥128, logical arena pixels, and the pack's original scale 0.65. Negative foot offset means the sole ends just above the pivot/ground line. This threshold avoids counting almost-transparent resampling fringes as solid soles.

| Fighter/clip | Visible height across four frames | Foot offset from ground | Main differences |
| --- | --- | --- | --- |
| Ali idle | 299.65, 297.70, **274.30**, 298.35 | −0.65 to 0 | `idle-1` opens the front hand; `idle-2` crouches sharply; head, hand and equipment shapes also vary. |
| Ali walk | 269.75, 273.00, 268.45, 269.75 | −0.65 to 0 | Heel/stride changes; `walk-3` extends an arm almost like a punch; face/body angle and equipment vary. |
| Elton idle | 291.20, 291.85, 287.95, 291.85 | −0.65 to 0 | `idle-2` opens both hands; the blue hologram panels appear/disappear or change arrangement. |
| Elton walk | 274.95, 274.30, 275.60, 274.95 | −0.65 | Similar foot heights, but shoulder/arm, backpack and panel arrangement change. |

Local corrected metadata sets each frame's foot pivot to its solid sole edge (525 or 526 source pixels). A **single** scale per fighter sets `idle-0` to 296 logical pixels, approximately the original stand-in's visible upright height:

- Ali: **0.6420824295**; Elton: **0.6607142857**.
- Foot offsets become 0 by that alpha-threshold measurement. Rasterized edges can still differ by a screen pixel with DPR/filtering.
- Source PNGs remain byte-for-byte untouched. Native source direction is right; left-facing mirroring was checked locally.
- These corrections do not normalize every frame's height. Ali's crouch is about **25.35 logical pixels / 8.46%** lower than the first idle frame before correction. Rescaling that frame to an upright height would stretch the body, not repair the animation.

## Remaining artwork work

1. Review Ali `idle-1` and `idle-2` against the source sheet: their source crops touch a grid edge. Padding the atlas cannot reconstruct a potentially cut finger/toe; redraw/export the complete extremities before final approval.
2. Decide whether the large Ali idle crouch and open-hand poses are intentional. They cause a pronounced vertical/gesture jump in a four-frame idle loop. The walk-to-idle transition also changes apparent body height; both characters need a consistent root and body model, while retaining genuine lean/crouch.
3. Redraw consistent faces, hair, gloves, straps, badges, shoes, backpacks and hologram panels. The sheets show frame-to-frame design changes; smoothing, pivots or scale cannot fix those differences.
4. Walk cycles need deliberate contact/passing poses and in-betweens, particularly the fourth-to-first wrap. Four illustrative poses alone do not establish believable foot planting or eliminate foot sliding at the game's movement speed.
5. **Missing for both fighters:** jump, fall, guard, light1/2/3, heavy, skill, ultimate, hurt, KO and victory. These remain geometric. Switching art styles is intentional and visible; the result is a technical integration preview, not finished animation.
6. Review consent/likeness and stronger silhouette/palette separation before public art integration. No permission has been inferred from the attachment or successful tests.

## Validation and reproducibility

- `npm test`: combat and atlas logic, including unsupported poses, malformed metadata, duration boundaries, source direction and sampling defaults.
- `npm run typecheck`: source, test and configuration TypeScript.
- `npm run build`: production bundle with no supplied images or metadata.
- `npm run test:e2e`: existing production gameplay checks, including full player and CPU wins, skill/ultimate, pause, rounds, KO and rematch.
- `npm run test:atlas`: real image decoding and Canvas pixel tests on synthetic fixtures: feet across frame changes, scale/mirroring, filter state, exact placeholder equivalence for twelve missing poses, retry after invalid dimensions, stale atlas removal and concurrent preparation.
- Private local review: all sixteen original/corrected frames rendered beside the stand-in, both directions and missing-pose comparisons, plus complete CPU matches with **Ali selected** and **Elton selected** using the real supplied atlases. Both reached two KOs, result and rematch reset with zero observed page errors. These are CPU-win scenarios; the existing production suite separately tests player victory.

Private contact sheets, screenshots, per-frame measurements, corrected metadata and browser results remain in the local review directory outside the repository. They are deliberately absent from PR artifacts. Browser success validates integration and combat regressions, not final animation quality or permission to publish.

The original desktop-input test had an unseeded opponent and stopped approaching before attacking; an actual knockback/ranged-AI sequence could leave every jab out of range. That check now uses a repeatable opponent and maintains approach during jabs. The damage, pause, input cleanup and navigation assertions remain in place; no production AI or combat rule was changed to make the test pass.
