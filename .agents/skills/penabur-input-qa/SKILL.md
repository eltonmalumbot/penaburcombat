---
name: penabur-input-qa
description: >
  Audit PENABUR Combat desktop keyboard and mobile touch actions, multi-touch
  gamepad, dash, combo press buffering, cancelled gestures and accessibility.
  Use when editing controls or responsiveness.
---

# PENABUR Combat — Input and Touch QA

Adapt input-systems discipline principles to existing src/ui/input.ts and the custom game engine, rather than copying Godot-specific or Unity-specific APIs.

## Audit sequence

1. Inventory the current actions and binding priority: movement A/D or arrows, jump W, guard S, light J, heavy K, skill L, ultimate U, dash Shift, pause P, selection Escape; review actual input.ts and screen controls for authoritative behavior.
2. Distinguish press edge versus held state. Discrete attacks must not repeat unintentionally; guard/movement state must clear on release, pointercancel, blur, page hide, disabled input and exit.
3. Check two-thumb mobile play: changing D-pad direction while attacking, simultaneous touches, one-finger cancellation, rapid double tap for dash, and button size/viewport constraints.
4. Test paused and backgrounded states. No buffered attack should fire unexpectedly on resume or after changing screens. Preserve established combo window and game-engine contract; change only in a dedicated, tested PR.
5. Include accessibility checks: visible focus, readable labels, safe touch target spacing, no essential unremappable chord; avoid unsupported claims of universal device support.
6. Run unit input/combination tests plus Chromium emulation in portrait and landscape at representative widths; physical Android/iPhone remains a separate approval gate.

Report exact actions, test cases, input leakage bugs fixed and anything requiring real-device verification.

No production deployment, merge to main, or unapproved control change without explicit owner authorization.
