---
name: penabur-art-qa
description: >
  Validate and review PENABUR Combat Ali or Elton HD sprite frames, alpha,
  pivots, identity, provenance, timelines and review-only atlas handoffs.
  Use for new sprites, art continuity, AI redraws, contact sheets and asset approval.
---

# PENABUR Combat — Art QA

Adapted to this custom Canvas game from the concepts in create-game-assets (upstream link in docs/GAMEDEV_AGENT_SKILLS.md).

## Before changing anything

- Check git status and current art review branch. Preserve all local ZIPs, frame PNGs, source generations and existing approved files.
- Read public/assets/fighters/README.md, docs/SPRITE_ATLASES.md, docs/ELTON_HD_ART_INTAKE.md, relevant issue and current art-review reports.
- Approved Ali and Elton idle/walk files are identity and geometry references, NOT permission to invent details. Never overwrite them.
- Pin provenance, rights note, reference SHA, artist/tool details, file count, alpha size, foot pivot, intended facing, pose order and clip windows before rendering.

## Per-batch pipeline

1. Choose a representative frame and review it at actual game scale first. Hold a family-wide visual brief: silhouette, face, clothing, badges, footwear, accessories, lighting and edge treatment must be coherent.
2. Validate exactly the required transparent RGBA 720x540 untrimmed frames, logical pivot (320,525), sufficient transparent margins, ground contact, pixel checksums and clip timing against src/game/moves.ts.
3. Reject exact duplicate poses; flag near-duplicate and suspiciously large geometry changes for human comparison, but do not automatically reject legitimate action movement.
4. Compare all adjacent F00–F05 poses: planted sole, arm/gear connection, face, costume, badge, FX edges, contact F02–F03 and recovery F04–F05. Check both right and mirrored left.
5. Run the existing review-only Python validator. Generate contact sheet and 1x/0.5x/0.25x playback. Check cropped alpha, hard cuts, color halos, fake checkerboard transparency, jitter and compression artifacts.
6. Keep original and revised candidates in distinct local folders; regenerate SHA-256 for every revised frame, atlas, manifest and report. Do not fake a PASS or reuse a stale hash.
7. Run appropriate Python, Node, Chromium and visual QA. Identify the HEAD SHA and hardware/viewport before claiming test coverage.
8. Produce a handoff of changed frames, screenshots, before/after, SHA, test evidence and explicit OPEN visual findings.

## Review gate

Technical asset validity is not visual approval. Require human review of identity and permission as well as motion, native-scale rendering and real Android/iPhone testing before any approved-art promotion.

No production asset overwrites, main merge, or production deployment without explicit owner authorization.
