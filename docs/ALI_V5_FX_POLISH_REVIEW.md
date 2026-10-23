# Ali Light 3 FX Polish V5 — candidate art handoff

**Review-only. Do not merge these generated/retouched sprites into production.**

## What is newly available
- Local source package: `PENABUR_Combat_Ali_FX_Polish_V5.zip` (provided in the ChatGPT project conversation, not committed to the game repository).
- Candidate atlas: `ali-combat-frames.png`, SHA-256 `43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521`, 4320×1620 PNG RGBA.
- 18 frames, 720×540 each; Light1/2 = 0.35 sec, Light3 = 0.39 sec, non-looping. Approved Ali idle/walk remains unchanged and has not been overwritten.
- Reproducible processing source included separately in the project conversation: `create_ali_v5.py`. Only Light3 frames F3/F4/F5 (zero-indexed filenames `light3-02.png`, `light3-03.png`, `light3-04.png`) received localized premultiplied-alpha edge softening in the cyan FX region. The other 15 frames are pixel-identical to V4.

## Objective measurements
The original V4 QA heuristic detects **9/18 frames** with at least one abrupt alpha-occupancy jump >= 95 pixels between adjacent columns.
The V5 candidate reduces this to **8/18 frames**. In Light3, the previous hard-cut x506 in F3 and x582 in F5 are no longer flagged; F4 still has an x633 alpha discontinuity. This is a _heuristic improvement only_, not proof of finished animation.

## Critical remaining blockers
- V5 is derivative/retouched V4 art; the Light3 F5 leg was composited from another frame in V4. This is NOT a independently authored, accepted HD keyframe.
- Light1 F6, Light2 F3/F4/F5/F6, Light3 F3/F4/F6 still flag strong internal alpha jumps, and Light3 F4 still has an FX-related discontinuity. Every warning requires actual review before deciding whether it is a defect.
- No Elton HD combat sprites are complete.
- No manual real-device and original-art approval has occurred.

## Review flow
Open this PR's Vercel preview at `/?aliArtReview=v5`, start a match, then choose `ali-combat-frames.png` from the locally extracted V5 ZIP. The browser verifies the exact SHA-256 and decode dimensions; you can switch back to approved Ali sprites. Use `/review/ali-combo-v2.html` for side-by-side frame examination and annotated hard-cut markers. All source PNG bytes remain local to the reviewer's browser.

**Release criteria:** Independent artist redraw of defective keyframes, real local PNG visual playback in both facings, GitHub Actions + SonarCloud + SHA-matching Vercel Preview, real Android/iOS input review and explicit owner approval prior to any merge. This PR must stay Draft until these gates pass.
