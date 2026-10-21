# Penabur Combat — Office Clash: 16.59

Independent, fictional, browser-based 2D fighting game prototype. This is not an official BPK PENABUR project. All fighter drawings are original stand-ins; no employees' photographs or likenesses are embedded.

The project uses TypeScript + HTML Canvas 2D + Vite. The playable MVP features Ali vs Elton with CPU, combo attacks, damage, ultimates, rounds, score, and seven roster slots. Work in progress.

Use Node 24 (`.nvmrc`) and npm. Development: `npm ci && npm run dev`; production: `npm run build` (output `dist`). No backend or secret credentials are needed to play.

Controls: **A/D** move, **W** jump, **S** guard, **J** three-hit combo (press repeatedly), **K** heavy, **L** skill (20 meter), **U** ultimate (65 meter), **Shift** dash, **P** pause, **Escape** fighter selection. Arrow keys/space are also supported. Touch controls appear on narrow screens. Hit or block to earn meter; the first fighter to win two rounds wins. Draws replay without awarding a point. Rematch resets all combat state.

Validation:

```sh
npm run check                       # combat/animation tests, all TS checks, production build
npx playwright install chromium     # once, unless Chromium is already installed
npm run test:e2e                    # production browser gameplay tests
npm run test:atlas                  # dev-module sprite tests, synthetic artwork only
```

For a system Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Browser tests start and stop their own preview server on port 4173. For an existing deployment, use `E2E_BASE_URL=https://your-deployment.example EXPECTED_DEPLOY_SHA=<full-sha> npm run test:e2e`; this tests the public site rather than starting a local server. `/build-info.json` identifies the commit used for the production build.

Implementation and regression audit: [docs/AUDIT.md](docs/AUDIT.md). Original/licensed sprite atlas integration: [docs/SPRITE_ATLASES.md](docs/SPRITE_ATLASES.md). No external fighter art has been added.

Phase 2 partial-atlas audit and remaining artwork issues: [docs/PHASE2_REVIEW.md](docs/PHASE2_REVIEW.md). Missing sprite poses retain the original geometric animation. Review-only artwork is kept outside the repository and is not part of the build or automated test fixtures.
