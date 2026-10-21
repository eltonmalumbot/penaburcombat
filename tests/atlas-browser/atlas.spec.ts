import { test, expect } from '@playwright/test';

// Only abstract colored rectangles: no supplied art, likenesses, or external assets.
const metadata = (image = 'fixture.svg') => ({ version: 1, image, scale: 1,
  frames: { a: { x: 0, y: 0, w: 100, h: 100, pivotX: 50, pivotY: 100 },
    b: { x: 100, y: 0, w: 100, h: 100, pivotX: 50, pivotY: 90 } },
  clips: { idle: { frames: [{ frame: 'a', duration: .1 }, { frame: 'b', duration: .1 }], loop: true },
    walk: { frames: [{ frame: 'b', duration: .1 }, { frame: 'a', duration: .1 }], loop: true } } });
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><path fill="#00ff00" d="M20 20h60v80H20z M120 10h60v80h-60z"/><path fill="#ff0000" d="M70 30h10v15H70z M170 20h10v15h-10z"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route('**/__atlas-test/**', async route => {
    if (route.request().url().endsWith('.json')) await route.fulfill({ json: metadata() });
    else await route.fulfill({ contentType: 'image/svg+xml', body: image });
  });
  await page.goto('/');
});

test('decoded sprites keep their feet anchored across frames, size, facing and sampling', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const atlas = await loadAtlas('/__atlas-test/fixture.json');
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    const f = createFighter('Ali', 200, 1); f.y = 250;
    const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
    const checks = [];
    for (const pose of ['idle', 'walk']) {
      for (const time of [.05, .15]) {
        f.pose = pose; f.animationTime = time;
        ctx.clearRect(0, 0, 400, 300); drawFighter(ctx, f, 1, atlas);
        checks.push(pixel(200, 249).join(',') === '0,255,0' && pixel(200, 251).join(',') !== '0,255,0');
      }
    }
    f.pose = 'idle'; f.animationTime = .05;
    ctx.clearRect(0, 0, 400, 300); drawFighter(ctx, f, 1, atlas); const right = pixel(225, 185);
    f.face = -1; ctx.clearRect(0, 0, 400, 300); drawFighter(ctx, f, 1, atlas); const left = pixel(175, 185);
    f.face = 1; ctx.clearRect(0, 0, 400, 300); drawFighter(ctx, f, .5, atlas); const small = pixel(212, 217);
    const modes: boolean[] = [], original = ctx.drawImage.bind(ctx);
    ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
      modes.push(ctx.imageSmoothingEnabled); original(...args);
    }) as typeof ctx.drawImage;
    ctx.imageSmoothingEnabled = false;
    drawFighter(ctx, f, 1, atlas); const restored = !ctx.imageSmoothingEnabled;
    atlas.metadata.sampling = 'pixelated'; drawFighter(ctx, f, 1, atlas);
    atlas.metadata.facing = 'left'; ctx.clearRect(0, 0, 400, 300); drawFighter(ctx, f, 1, atlas);
    return { checks, right, left, small, modes, restored, sourceLeft: pixel(175, 185) };
  });
  expect(result.checks).toEqual([true, true, true, true]);
  for (const pixel of [result.right, result.left, result.small, result.sourceLeft]) expect(pixel).toEqual([255, 0, 0]);
  expect(result.modes).toEqual([true, false, false]); expect(result.restored).toBe(true);
});

test('unsupported attacks, guard, jump, hurt and KO exactly retain the geometric animation', async ({ page }) => {
  const matching = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const atlas = await loadAtlas('/__atlas-test/fixture.json');
    const a = document.createElement('canvas'), b = document.createElement('canvas');
    a.width = b.width = 800; a.height = b.height = 700;
    const ca = a.getContext('2d')!, cb = b.getContext('2d')!;
    const poses = ['jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory'];
    return poses.map(pose => {
      const f = createFighter('Elton', 400, -1); f.y = 570; f.pose = pose;
      if (['heavy', 'skill', 'ultimate'].includes(pose) || pose.startsWith('light')) {
        f.attack = { move: pose.startsWith('light') ? 'light' : pose, combo: pose.startsWith('light') ? Number(pose.at(-1)) : 0, elapsed: .3, connected: false, queued: false };
      }
      f.guard = pose === 'guard';
      ca.clearRect(0, 0, 800, 700); cb.clearRect(0, 0, 800, 700);
      drawFighter(ca, f, 1, atlas); drawFighter(cb, f);
      return a.toDataURL() === b.toDataURL();
    });
  });
  expect(matching).toHaveLength(12); expect(matching.every(Boolean)).toBe(true);
});

test('image bounds fail safely, corrected images retry, and a removed atlas cannot stay on screen', async ({ page }) => {
  let attempts = 0;
  await page.route('**/__atlas-test/retry.svg', async route => {
    attempts++;
    const body = attempts === 1 ? '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' : image;
    await route.fulfill({ contentType: 'image/svg+xml', body });
  });
  await page.route('**/__atlas-test/retry.json', route => route.fulfill({ json: metadata('retry.svg') }));
  const result = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    let rejected = false;
    try { await loadAtlas('/__atlas-test/retry.json'); } catch { rejected = true; }
    await loadAtlas('/__atlas-test/retry.json');
    const { GameRenderer } = await import('/src/render/renderer.ts' as string);
    const { CombatEngine } = await import('/src/game/engine.ts' as string);
    const { character } = await import('/src/game/characters.ts' as string);
    const canvas = document.createElement('canvas'); canvas.style.width = '1280px'; document.body.append(canvas);
    const renderer = new GameRenderer(canvas), state = new CombatEngine('Ali').state;
    renderer.draw(state, 0, false); const baseline = canvas.toDataURL();
    character('Ali').atlasUrl = character('Elton').atlasUrl = '/__atlas-test/fixture.json';
    await renderer.prepare(['Ali', 'Elton']); renderer.draw(state, 0, false);
    const changed = canvas.toDataURL() !== baseline;
    delete character('Ali').atlasUrl; delete character('Elton').atlasUrl;
    await renderer.prepare(['Ali', 'Elton']); renderer.draw(state, 0, false);
    return { rejected, changed, restored: canvas.toDataURL() === baseline };
  });
  expect(attempts).toBe(2); expect(result).toEqual({ rejected: true, changed: true, restored: true });
});

test('a delayed pair never shows a half-loaded matchup or overwrites a newer preparation', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/__atlas-test/delayed.json', async route => {
    await gate; await route.fulfill({ json: metadata() });
  });
  const fastImage = page.waitForResponse('**/__atlas-test/fixture.svg');
  await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/render/renderer.ts' as string);
    const { CombatEngine } = await import('/src/game/engine.ts' as string);
    const { character } = await import('/src/game/characters.ts' as string);
    const canvas = document.createElement('canvas'); canvas.style.width = '1280px'; document.body.append(canvas);
    const renderer = new GameRenderer(canvas), state = new CombatEngine('Ali').state;
    renderer.draw(state, 0, false);
    character('Ali').atlasUrl = '/__atlas-test/fixture.json'; character('Elton').atlasUrl = '/__atlas-test/delayed.json';
    Object.assign(window, { atlasPairQA: { renderer, state, canvas, baseline: canvas.toDataURL(), pending: renderer.prepare(['Ali', 'Elton']) } });
  });
  await fastImage;
  const stableBeforeRelease = await page.evaluate(async () => {
    const qa = (window as unknown as { atlasPairQA: { renderer: { draw: (...args: unknown[]) => void; prepare: (ids: string[]) => Promise<void> }; state: unknown; canvas: HTMLCanvasElement; baseline: string } }).atlasPairQA;
    const { character } = await import('/src/game/characters.ts' as string);
    qa.renderer.draw(qa.state, 0, false); const unchanged = qa.canvas.toDataURL() === qa.baseline;
    delete character('Ali').atlasUrl; delete character('Elton').atlasUrl;
    await qa.renderer.prepare(['Ali', 'Elton']);
    return unchanged;
  });
  release();
  const stableAfterRelease = await page.evaluate(async () => {
    const qa = (window as unknown as { atlasPairQA: { renderer: { draw: (...args: unknown[]) => void }; state: unknown; canvas: HTMLCanvasElement; baseline: string; pending: Promise<void> } }).atlasPairQA;
    await qa.pending; qa.renderer.draw(qa.state, 0, false); return qa.canvas.toDataURL() === qa.baseline;
  });
  expect(stableBeforeRelease).toBe(true); expect(stableAfterRelease).toBe(true);
});
