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

test('missing combat clips keep HD bodies for every pose and facing, without geometric rectangles', async ({ page }) => {
  const results = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const atlas = await loadAtlas('/__atlas-test/fixture.json');
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 700;
    const ctx = canvas.getContext('2d')!;
    let sprites = 0, rectangles = 0;
    const image = ctx.drawImage.bind(ctx), rect = ctx.fillRect.bind(ctx);
    ctx.drawImage = ((...args: Parameters<typeof ctx.drawImage>) => { sprites++; image(...args); }) as typeof ctx.drawImage;
    ctx.fillRect = (...args) => { rectangles++; rect(...args); };
    const results = [];
    for (const face of [-1, 1]) for (const pose of ['jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory']) {
      const f = createFighter('Elton', 400, face); f.y = 570; f.pose = pose;
      if (['heavy', 'skill', 'ultimate'].includes(pose) || pose.startsWith('light')) {
        f.attack = { move: pose.startsWith('light') ? 'light' : pose, combo: 1, elapsed: .15, connected: false, queued: false };
      }
      sprites = 0; rectangles = 0;
      drawFighter(ctx, f, 1, atlas);
      results.push({ sprites, rectangles });
    }
    return results;
  });
  expect(results).toHaveLength(24);
  for (const result of results) expect(result).toEqual({ sprites: 1, rectangles: 0 });
});

test('authored synthetic heavy attack uses distinct frames and keeps fallback for missing poses', async ({ page }) => {
  const source = metadata();
  await page.route('**/__atlas-test/combat.json', route => route.fulfill({ json: {
    ...source, clips: { ...source.clips, heavy: {
      frames: [{ frame: 'a', duration: .12 }, { frame: 'b', duration: .18 }],
      loop: false,
    } },
  } }));
  const result = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const atlas = await loadAtlas('/__atlas-test/combat.json');
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    const original = ctx.drawImage.bind(ctx);
    const sourceXs: number[] = [];
    ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
      if (args.length === 9) sourceXs.push(args[1] as number);
      original(...args);
    }) as typeof ctx.drawImage;
    const fighter = createFighter('Ali', 300, 1);
    fighter.y = 400;
    const before = { x: fighter.x, y: fighter.y };
    for (const time of [.05, .13, 10]) {
      // Give the sprite clock conflicting values: only the attack clock is authoritative.
      fighter.pose = 'heavy'; fighter.animationTime = time === .05 ? 10 : time === .13 ? 0 : .01;
      fighter.attack = { move: 'heavy', elapsed: time, combo: 1, connected: false, queued: false };
      drawFighter(ctx, fighter, 1, atlas);
    }
    fighter.pose = 'hurt'; fighter.animationTime = .13; fighter.attack = null;
    drawFighter(ctx, fighter, 1, atlas); // Fallback is still allowed for missing authored poses.
    fighter.pose = 'heavy'; fighter.face = -1; fighter.animationTime = .13;
    drawFighter(ctx, fighter, 1, atlas);
    return { sourceXs, untouched: fighter.x === before.x && fighter.y === before.y };
  });
  expect(result.sourceXs).toEqual([0, 100, 100, 0, 100]);
  expect(result.untouched).toBe(true);
});

test('approved Ali and Elton pose boards retain original HD cutouts in both directions', async ({ page }, testInfo) => {
  for (const fighter of ['Ali', 'Elton']) {
    await page.evaluate(async fighter => {
      const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
      const { drawFighter } = await import('/src/render/renderer.ts' as string);
      const { createFighter } = await import('/src/game/characters.ts' as string);
      const atlas = await loadAtlas(`/assets/fighters/${fighter.toLowerCase()}.json`);
      const canvas = document.createElement('canvas'); canvas.id = 'pose-board'; canvas.width = 2100; canvas.height = 1600;
      document.body.replaceChildren(canvas);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#172440'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const poses = ['idle', 'walk', 'jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory'];
      for (const [direction, face] of [1, -1].entries()) for (const [i, pose] of poses.entries()) {
        const x = i % 7 * 300 + 150, y = (Math.floor(i / 7) + direction * 2) * 400 + 360;
        const f = createFighter(fighter, x, face); f.y = y; f.pose = pose; f.animationTime = .16;
        if (['heavy', 'skill', 'ultimate'].includes(pose) || pose.startsWith('light')) {
          f.attack = { move: pose.startsWith('light') ? 'light' : pose, combo: 1, elapsed: .15, connected: false, queued: false };
        }
        drawFighter(ctx, f, .85, atlas);
        ctx.fillStyle = '#ffffff'; ctx.font = '18px system-ui'; ctx.fillText(`${pose} / ${face}`, x - 120, y + 30);
      }
    }, fighter);
    await page.locator('#pose-board').screenshot({ path: testInfo.outputPath(`${fighter}-poses.png`) });
  }
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
