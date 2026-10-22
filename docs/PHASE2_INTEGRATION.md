# PENABUR Combat — Phase 2 integration

**16.59 — Fight for Friday!**

## Authorization and merge sequence

The project owner confirmed permission to publish the supplied Ali/Elton likeness artwork for this game in the Phase 2 implementation request. The consented integration package repeats that statement. No staff photographs, official organization logos, or claims of organizational affiliation are included. The game is explicitly independent, not an official BPK PENABUR product. The text wordmark is original; this release does not assert ownership of an organization's marks or authorize unrelated reuse.

Code-only PR #1 at `2b109ac1f6c1010c297e4cecc38215c2d75ce9a5` had successful build, SonarCloud and Vercel checks, was conflict-free, and was made ready before merging. Its merge commit is `5d344815711729fd54307eafab664799b857f8c7`. This integration is a separate follow-up PR, retaining its loader safeguards and HD sampling, direction support, retry and asynchronous loading protections.

## Assets and curation

`public/assets/fighters/ali.png` and `elton.png` are byte-identical to the supplied consented package. Included SHA-256 files and unit tests verify their bytes and 1600×1080, 8-bit RGBA headers. All eight 400×540 source rectangles per fighter are preserved and bounds-checked. The metadata keeps foot pivots 525/526 and a single uniform scale per fighter: Ali **0.6420824295**, Elton **0.6607142857**, with smooth sampling and native right-facing art.

Active idle uses **idle-0 only**. Ali's former idle-2 dip (about 25 pixels) and open-hand/grid-edge idle poses no longer produce repeated idle pops. Elton's equipment no longer flickers through four different idle arrangements. Active walk is **0 → 1 → 2 → 1**, at 0.15 seconds per frame; the extended-arm fourth source pose is excluded, and the last-to-first seam is now the same neighboring pair used earlier in the loop. Frames are not stretched, blurred, recolored or interpolated into double faces. Source rectangles not selected for playback remain available for future corrected artwork.

The sole edge remains at the logical ground line, including after facing flips. Ali's selected walk silhouettes range roughly **265.2–269.7** logical pixels tall and Elton's **278.8–280.1**, versus the upright reference near 296. Their forward lean/body design still changes apparent height when entering walk. Metadata does not reconstruct clipped fingers/toes, alter faces or retarget a rig.

**Artwork status: limited HD animation, not final animation.** Hand/gear/hologram designs still vary across walk poses; foot sliding and imperfect stride/contact can remain. Redraw consistent contact/passing poses and accessories from a single model before claiming a polished full walk cycle. Elton's supplied blue hologram pixels are preserved; his UI, health bar and hit effects use neon-red accents over dark blue. No image edits were used to force a palette change.

## Rendering and UI

Menu, character cards and selection preview share the fight atlas/cache and redraw once decoded. A removed screen is not repainted by late portrait loads. Loading/decode failure draws the original stand-in, without blocking navigation or combat. Battles still load the pair together; unsupported poses now use explicitly temporary HD staging as described in `PHASE2B.md`.

The PENABUR Combat text wordmark/subtitle appears in header, menu, selection context, match bar and result screen; tab title, description and OpenGraph metadata match. Dark blue/cyan, red and gold accents, system typography, responsive cards and larger two-row mobile controls replace the prior styling. There is no external font request, CSS blur, official logo or extra continuously animated menu loop. Static portraits do not add per-frame work. Two decoded atlas images are shared across portraits and fights.

Ali remains Data Strategist, with **HEIST PROTOCOL**; Elton remains Shadow Developer, with **NIGHT DEPLOY**. Names are presented in selection and HUD/ultimate banners. Engine attack identity and accessible event notices remain compatible with prior tests. Damage, hitboxes, pushboxes, jump physics, CPU, meter costs, combo/round timings and movement speed are unchanged. Five roster slots remain locked.

## Missing HD poses

Both characters lack authored **jump/fall, guard, light1/2/3, heavy, skill, ultimate, hurt, KO and victory**. Phase 2B supersedes the original geometric-pose policy: these states keep the stable HD cutout with explicit temporary staging/effects. See `PHASE2B.md`; these are not final combat animations.

## Validation and publication checks

- Unit tests cover combat, schema/sampling, supplied asset checksums/dimensions, all sixteen rectangles, pivots, curated playback, declared paths and missing poses.
- Production browser tests exercise branding/metadata, actual decoded sprite draw calls (two distinct atlas images, idle/walk rows, both facing signs), both full-match outcomes, mobile Elton, skills/ultimates, KO, rounds, rematch, and forced 404 image fallback.
- Synthetic browser tests cover pixel-level foot alignment across frames/scale/facing, filter isolation, HD-only drawing for missing poses, retry and concurrent loading.
- Visual review uses real desktop/mobile screenshots of menu, Ali/Elton selection and battle, followed by Vercel preview review. Automatic tests validate integration, not final illustration quality.
- Before merge, verify CI, conflicts and preview. After merge, verify Vercel success, HTTP 200, `/build-info.json` SHA, JS/CSS/image responses and production browser gameplay. Report the actual resulting SHA and test outcomes, without labeling incomplete animation final.
