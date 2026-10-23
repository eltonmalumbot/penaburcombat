# PENABUR Combat

**16.59 — Fight for Friday!**

An independent, fictional browser fighting game built with TypeScript, HTML Canvas 2D and Vite. This is **not an official BPK PENABUR product** and uses no official organization logo. Repository and production domain remain `eltonmalumbot/penaburcombat` and https://penaburcombat.vercel.app.

Ali, the **Data Strategist**, faces Elton, the **Shadow Developer**, in a best-of-three CPU duel. Ali's ultimate is **HEIST PROTOCOL**; Elton's is **NIGHT DEPLOY**. The roster still contains Ali, Patrick, Niko, Marco, Lia, Kris and Elton. Only Ali and Elton are playable.

The project owner confirmed permission to publish the supplied Ali/Elton likeness artwork for this game. Their original PNG atlases are included unchanged, with curated idle/walk clips and foot-aligned metadata. Menus, selection cards and the arena use HD art. Missing combat clips use temporary whole-sprite HD staging and separate Canvas effects. Geometric bodies are reserved for missing or failed atlases. See [Phase 2B](docs/PHASE2B.md) for the explicit temporary-pose inventory. **This is partial HD coverage, not finished rigged animation.** See [the integration/visual report](docs/PHASE2_INTEGRATION.md) and [asset provenance](public/assets/fighters/README.md).

## Development

Use Node 24 (`.nvmrc`) and npm. No backend or secret credentials are required.

```sh
npm ci
npm run dev
```

Production: `npm run build` (output `dist`). Controls: **A/D** move, **W** jump, **S** guard, **J** three-hit combo (press repeatedly), **K** heavy, **L** skill (20 meter), **U** ultimate (65 meter), **Shift** dash, **P** pause, **Escape** fighter selection. Arrow keys/space also work. Mobile touch controls use separate movement and attack rows. Earn meter by hitting/blocking; two round wins take the match. Draws replay without a point; rematch resets combat state.

## Validation

```sh
npm run check                      # unit/asset tests, source/test typechecks, production build
npx playwright install chromium    # once, unless system Chromium is installed
npm run test:e2e                    # production gameplay, branding, real sprites, fallback and mobile
npm run test:atlas                  # synthetic Canvas/loader regression tests on a dev server
```

For system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. The suites manage their own servers on ports 4173 and 5174. For a real deployment, run `E2E_BASE_URL=https://your-deployment.example EXPECTED_DEPLOY_SHA=<full-sha> npm run test:e2e` with the platform's required network/proxy configuration. `/build-info.json` identifies the deployed commit; a deployment is current only when its SHA matches the intended commit and its smoke checks succeed.

[Sprite atlas format](docs/SPRITE_ATLASES.md) · [Current Phase 2 integration](docs/PHASE2_INTEGRATION.md) · [Historical MVP audit](docs/AUDIT.md) · [Historical code-only atlas review](docs/PHASE2_REVIEW.md)

## Mobile Control System V2 (preview)

For landscape browser play, the movement D-pad is on the left and arcade attacks on the right. LIGHT is emphasized; tap it repeatedly to chain the three-hit combo. **Double-tap the same LEFT or RIGHT arrow** with two separate quick touch taps to Dash. The visible DASH button remains as an alternative. Sliding a held finger between direction buttons changes direction while keeping other fingers on attack buttons independent. Short taps no longer require waiting through the first attack startup to buffer the next light strike.

Use **PAD: NORMAL / LARGE / COMPACT** in the match toolbar to cycle control sizes. The selection is stored locally where the browser permits storage. A darkened SKILL button means below 20 meter; a darkened ULTIMATE button means below 65 meter. Both glow when the move can be paid for. Their availability remains enforced by the original combat engine; these are visual hints, not altered damage or meter rules. Keyboard Shift and all existing key mappings remain available.

The mobile gamepad is an opt-in PR preview until real iPhone Safari/Android Chrome touch QA and visual review. These CI tests use desktop Chromium touch emulation and synthetic browser pointer events; passing them does not prove the experience feels right on every device.
