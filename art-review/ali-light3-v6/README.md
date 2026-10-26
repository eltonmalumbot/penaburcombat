# Ali Light3 V6 — actual AI-redrawn F4/F5 candidate

**REVIEW ONLY — NOT APPROVED FOR PRODUCTION.** These are new full-body AI-generated
contact and follow-through drawings, not human-authored finished art or the V5
borrowed-leg composite. The project owner must approve likeness, animation and
usage before release. This does not complete Phase 3A or close Issue #18.

- [F4/contact, 720×540 RGBA](inputs/light3-03.png)
- [F5/follow-through, 720×540 RGBA](inputs/light3-04.png)
- [Exact 18-frame V6 atlas](candidate/ali-combat-frames.png), [manifest](candidate/manifest.json)
- [Native/mirrored F3–F6](evidence/two-facings.png)
- Looped review animations: [right 1×](evidence/light3-right-1x.webp), [left 1×](evidence/light3-left-1x.webp), [right 0.25×](evidence/light3-right-025x.webp), [left 0.25×](evidence/light3-left-025x.webp). WebP frame durations were explicitly set to 50/40/30/45/45/180 ms (4× at quarter speed) and independently decoded to verify them; these diagnostic loops do not change the nonlooping game clips.
- [Before/after](evidence/before-after.png) — V5 panels are reference-only composites
- [Provenance, source/output checksums and export operations](PROVENANCE.json)

Atlas SHA-256:
`1f71c0f4498acbe5e9d55c93953bb8ad294e0a7f33715092b0135b9b2da008c4`.
The source V5 ZIP and atlas were independently hash-checked and its original
`validate_pack.py` passed. The approved Ali source SHA remains
`3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905`.

## Creation and registration

The authoring tool was OpenAI image generation, directed by Codex at the owner's
request on 2026-10-26. F4 used approved Ali and actual V5 F3 as design/registration
references. F5 was a separate full-character generation referencing the new F4,
approved Ali and existing F6, with bent elbow/retracted palm and fading impact.
Both legs/shoes are part of those new generated images; no V5 limb pixels were
pasted. Raw 1448×1086 generations are retained under `source-generations/`.
This is a provenance statement about the actual workflow, not a general license
or independent legal certification. See the repository's original consent record.

For both images the same mechanical export removed only generator speckle below
8/255 alpha, uniformly scaled the entire drawing by 50%, then registered it with
translation (-12,+18) on the untrimmed 720×540 output canvas. No anatomy was warped
or stretched. The final nonzero alpha bounds are F4 `(106,108,629,525)` and F5
`(107,103,549,524)`: both have clear margins and sole contact near y=525.

The unchanged rebuilder produced the atlas. Because it re-encodes PNGs, packaging
then pixel-compared and restored the original V5 **byte streams** for the other
16 frames and updated their `frameQA` checksums. Revalidation confirms exact atlas
pixels and every file checksum. Only the F4/F5 frame PNG files differ from V5. Historical V5 cleanup/composite notes are retained under `sourceV5History`; current candidate metadata describes the new redraws and pending approval.
The separately retained original F4/F5 are conspicuously named composite references.

## Local opt-in review

Run `npm ci` and `npm run dev`. Open the dev or Vercel Preview URL with
`/?aliArtReview=v6`, choose Ali and VS CPU or Practice Combos, and explicitly choose
`candidate/ali-combat-frames.png` from disk. Nothing is loaded automatically.
Use existing 1×/0.5×/0.25× controls, LIGHT combo and Capture PNG. Reset returns the
approved sprite. The normal URL continues using approved Ali/Elton art only.

The existing `/review/ali-combo-v2.html` also accepts this exact V6 checksum.
Choose LIGHT 3, step F3–F6, check Hadap kiri, and play at 1×/0.5×/0.25×.
All binaries stay outside `public/`, so they are not copied to production `dist`.
Only the exact local-file SHA is admitted; arbitrary PNGs remain rejected.

## Revalidate

Use Python 3.12 and binary-only Pillow 11.3.0:

```sh
python scripts/ali_light3_validate.py --root art-review/ali-light3-v6/candidate
python -m unittest discover -s tests -p 'test_ali_light3_pipeline.py' -v
npm run check
npm run test:e2e
npm run test:atlas
```

`tests/atlas-browser/ali-v6-art.spec.ts` uses these actual binary bytes (not synthetic
substitutes), steps and plays both facings, verifies real F4/F5 draw calls in VS
and Practice at each speed, and checks drawing does not mutate fighter state.
The other atlas tests retain synthetic fixtures and fallback/default-mode checks.
Local results: 44 Node, 9 Python, 25 gameplay and 27 atlas cases passed; build/typechecks and real V6 validator passed. Test clock control prevents browser-action wall time from accidentally advancing combat. In-game screenshots capture the completed game Canvas at exact F4/F5 draws. Latest-commit external gates are recorded in the Draft PR.

## Visual findings and release gates

F4/F5 show intact arms, both legs and shoes; contact extends the palm and bright
burst, follow-through retracts the elbow/hand and diminishes the effect. New
F4/F5 shoes register within about one pixel vertically. The sheet shows readable
native/mirrored actions. This is agent visual inspection, **not owner approval**.

The inherited F3/F6 and other V5 frames are still unapproved and have known cropped
alpha/equipment discontinuities. Equipment/face detail differences across generated
and inherited frames remain a human-review risk. No claim of fully fluid,
production-ready animation, measured 60 FPS or physical Android/iPhone QA is made.

Keep this and all parent PRs Draft until human art signoff, external checks and
physical device review pass. No engine, damage, hitbox, AI, meter, timing, controls,
roster, renderer or approved production sprite changes are part of this art PR.
Elton combat production remains deferred until Ali is approved.
