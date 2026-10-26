# Ali Light3 — bidirectional continuity QA

This is a **review-only** aid stacked on Draft PR #24, not final combat art.

## Use after independently authored F4/F5 arrive

Build and validate the complete V6 candidate with `scripts/ali_light3_rebuild.py` and `scripts/ali_light3_validate.py` as documented in `docs/ALI_LIGHT3_F4_F5_ARTIST_HANDOFF.md`. Then run:

```bash
python scripts/ali_light3_review_sheet.py \
  --root /tmp/ali-light3-review-EXACT_GENERATED_DIRECTORY \
  --output /tmp/ali-light3-continuity-review.png
```

The PNG shows F3/F4/F5/F6 in **native right** and **mirrored left** orientations, with boot baseline at y=525 and the flipped ground-pivot marker. Visually inspect anatomy, backpack, both shoes, planted ground alignment, transitions and blue FX borders. The image is a static contact sheet; **actual timed gameplay playback is still required** for approval.

## Safeguards

- Exact V6 candidate manifest, all 18 image checksums and atlas pixels/timings are reverified before rendering.
- The source candidate stays unchanged. Output creation is exclusive (no overwrites).
- The rebuilder refuses F4 and F5 if they are identical to each other or clone an existing V5 pose.
- Tests use synthetic art only; no V5 review PNG is added to the repository.
- This does not certify likeness, independently authored anatomy, artistic continuity or production rights. Human review and real phone QA remain mandatory.

No modifications to combat engine, hitboxes, AI, input, damage, meter, roster or published sprites. Do not merge this stacked branch directly to main before PRs #22–#24 and their review gates are resolved.
