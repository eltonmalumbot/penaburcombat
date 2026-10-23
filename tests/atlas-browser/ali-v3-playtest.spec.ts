import { test, expect } from '@playwright/test';

test('normal game never shows candidate-art loader without explicit review opt-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#ali-v3-local-file')).toHaveCount(0);
  await expect(page.locator('.art-playtest')).toHaveCount(0);
});

test('review opt-in rejects forged PNG without activating new fighter artwork', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/?aliArtReview=v3');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.getByText('REVIEW ONLY — Ali Combo V3/V4/V5 belum disetujui')).toBeVisible();
  await expect(page.locator('#ali-v3-review-status')).toContainText('sprite Ali asli');
  await page.locator('#ali-v3-local-file').setInputFiles({
    name: 'ali-combat-frames.png', mimeType: 'image/png',
    buffer: Buffer.alloc(256, 0xa5),
  });
  await expect(page.locator('#ali-v3-review-status')).toContainText('Checksum salah');
  await page.getByRole('button', { name: 'Control j', exact: true }).click();
  await expect(page.locator('#game')).toBeVisible();
  expect(errors).toEqual([]);
});

test('synthetic review atlas preserves original idle/walk and exposes 18 timed attacks', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { loadAtlas, sampleFrame, validateAtlasImage } = await import('/src/animation/atlas.ts' as string);
    const { assembleAliReviewAtlas } = await import('/src/animation/review-ali.ts' as string);
    const { spritePresentation } = await import('/src/animation/presentation.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const base = await loadAtlas('/assets/fighters/ali.json');
    const canvas = document.createElement('canvas');
    canvas.width = 4320; canvas.height = 1620;
    const context = canvas.getContext('2d')!;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      context.fillStyle = `rgb(${50 + row * 60}, ${40 + col * 20}, 160)`;
      context.fillRect(col * 720 + 50, row * 540 + 70, 100, 200);
    }
    const img = new Image(); img.src = canvas.toDataURL('image/png'); await img.decode();
    // This is a synthetic fixture passed to the pure assembler, NOT a bypass
    // in the external file importer (which verifies the real V3 SHA-256).
    // Fail if the assembler recreates a giant PNG Canvas via toBlob().
    const previousToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = () => { throw new Error('PNG re-encode forbidden in art preview'); };
    let composed;
    try { composed = await assembleAliReviewAtlas(base, img); }
    finally { HTMLCanvasElement.prototype.toBlob = previousToBlob; }
    validateAtlasImage(composed.metadata, 4320, 2700);
    const f = createFighter('Ali', 250, 1);
    f.pose = 'light3'; f.animationTime = 10;
    f.attack = { move: 'light', combo: 3, elapsed: .06, connected: false, queued: false };
    const first = spritePresentation(composed.metadata, f).frame.x;
    f.attack.elapsed = .15;
    const next = spritePresentation(composed.metadata, f).frame.x;
    const totals = ['light1','light2','light3'].map(id =>
      composed.metadata.clips[id].frames.reduce((sum: number, key: { duration: number }) => sum + key.duration, 0));
    return {
      originalIdle: JSON.stringify(sampleFrame(base.metadata, 'idle', 0)) === JSON.stringify(sampleFrame(composed.metadata, 'idle', 0)),
      originalWalk: JSON.stringify(sampleFrame(base.metadata, 'walk', .18)) === JSON.stringify(sampleFrame(composed.metadata, 'walk', .18)),
      oneShots: ['light1','light2','light3'].every(id => !composed.metadata.clips[id].loop && composed.metadata.clips[id].frames.length === 6),
      totals, first, next, frameCount: Object.keys(composed.metadata.frames).length,
      originalImageReused: composed.image === base.image,
      combatLayerReused: composed.combatPreview?.image === img,
      combatYOffset: composed.combatPreview?.startY,
    };
  });
  expect(result.originalIdle).toBe(true);
  expect(result.originalWalk).toBe(true);
  expect(result.oneShots).toBe(true);
  expect(result.totals[0]).toBeCloseTo(.35);
  expect(result.totals[1]).toBeCloseTo(.35);
  expect(result.totals[2]).toBeCloseTo(.39);
  expect(result.frameCount).toBe(26);
  expect(result.originalImageReused).toBe(true);
  expect(result.combatLayerReused).toBe(true);
  expect(result.combatYOffset).toBe(1080);
  expect(result.first).toBe(720);
  expect(result.next).toBe(2160);
});


test('review v4 query exposes guarded art loader and the expected verified digest', async ({ page }) => {
  await page.goto('/?aliArtReview=v4');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.getByText('REVIEW ONLY — Ali Combo V3/V4/V5 belum disetujui')).toBeVisible();
  await expect(page.locator('#ali-v3-review-status')).toContainText('sprite Ali asli');
  const pinned = await page.evaluate(async () => {
    const mod = await import('/src/animation/review-ali.ts' as string);
    return mod.ALI_V4_SHA256;
  });
  expect(pinned).toBe('b998f44db137f601617852e9fb7083a17c507839e60d562015fce8df4e660325');
  await page.locator('#ali-v3-local-file').setInputFiles({
    name: 'ali-combat-frames.png', mimeType: 'image/png',
    buffer: Buffer.alloc(256, 0xbb),
  });
  await expect(page.locator('#ali-v3-review-status')).toContainText('Checksum salah');
  await page.getByRole('button', { name: 'Kembalikan sprite Ali asli' }).click();
  await expect(page.locator('#ali-v3-review-status')).toContainText('Sprite Ali asli aktif kembali');
});


test('review renderer uses original pixels for idle and candidate pixels for strikes', async ({ page }) => {
  await page.goto('/');
  const hits = await page.evaluate(async () => {
    const { loadAtlas } = await import('/src/animation/atlas.ts' as string);
    const { assembleAliReviewAtlas } = await import('/src/animation/review-ali.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const original = await loadAtlas('/assets/fighters/ali.json');
    const synthetic = document.createElement('canvas');
    synthetic.width = 4320; synthetic.height = 1620;
    const candidate = new Image();
    candidate.src = synthetic.toDataURL('image/png'); await candidate.decode();
    const atlas = assembleAliReviewAtlas(original, candidate);
    const target = document.createElement('canvas').getContext('2d')!;
    const sources: { source: string; cropY: number }[] = [];
    (target as unknown as { drawImage: (...args: unknown[]) => void }).drawImage = (...args: unknown[]) => {
      sources.push({ source: args[0] === candidate ? 'candidate' : args[0] === original.image ? 'original' : 'other', cropY: args[2] as number });
    };
    const fighter = createFighter('Ali', 250, 1);
    fighter.pose = 'idle';
    drawFighter(target, fighter, 1, atlas);
    const idle = sources.at(-1);
    sources.length = 0;
    fighter.pose = 'light3'; fighter.attack = {
      move: 'light', combo: 3, elapsed: .15, connected: false, queued: false,
    };
    drawFighter(target, fighter, 1, atlas);
    const contact = sources.at(-1);
    return { idle, contact };
  });
  expect(hits).toEqual({
    idle: { source: 'original', cropY: 0 },
    contact: { source: 'candidate', cropY: 1080 },
  });
});


test('review-only slow motion and PNG capture work without changing the default game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.locator('#ali-review-speed')).toHaveCount(0);
  await expect(page.locator('#ali-review-capture')).toHaveCount(0);

  await page.goto('/?aliArtReview=v4');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  const speed = page.getByRole('combobox', { name: 'Review combat speed' });
  await expect(speed).toHaveValue('1');
  await speed.selectOption('0.25');
  await expect(speed).toHaveValue('0.25');
  await page.getByRole('button', { name: 'Control j', exact: true }).click();
  const incoming = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Capture review game frame' }).click();
  const artifact = await incoming;
  expect(artifact.suggestedFilename()).toMatch(/^penabur-ali-original-(idle|light1|light2|light3|hurt|ko|guard|walk|jump|fall|heavy|skill|ultimate|victory)-round1\.png$/);
  const stream = await artifact.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const piece of stream!) chunks.push(Buffer.from(piece));
  expect(Buffer.concat(chunks).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  await speed.selectOption('0.5');
  await expect(speed).toHaveValue('0.5');
  await speed.selectOption('1');
  await expect(speed).toHaveValue('1');
});


test('review v5 offers an opt-in loader with a pinned FX-polish digest', async ({ page }) => {
  await page.goto('/?aliArtReview=v5');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.getByText('REVIEW ONLY — Ali Combo V3/V4/V5 belum disetujui')).toBeVisible();
  const digest = await page.evaluate(async () => (await import('/src/animation/review-ali.ts' as string)).ALI_V5_SHA256);
  expect(digest).toBe('43b0140642cf023be71f3d8d1bd69ca391d43f39abad35cf287cf8d21b06b521');
  await page.locator('#ali-v3-local-file').setInputFiles({
    name: 'ali-combat-frames.png', mimeType: 'image/png', buffer: Buffer.alloc(256, 0xee),
  });
  await expect(page.locator('#ali-v3-review-status')).toContainText('Checksum salah');
  await expect(page.locator('#game')).toBeVisible();
});
