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
  await expect(page.getByText('REVIEW ONLY — Ali Combo V3 belum disetujui')).toBeVisible();
  await expect(page.locator('#ali-v3-review-status')).toContainText('sprite Ali asli');
  await page.locator('#ali-v3-local-file').setInputFiles({
    name: 'ali-combat-frames.png', mimeType: 'image/png',
    buffer: Buffer.from('not the approved V3 PNG bytes'),
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
    const composed = await assembleAliReviewAtlas(base, img);
    validateAtlasImage(composed.metadata, composed.image.naturalWidth, composed.image.naturalHeight);
    const f = createFighter('Ali', 250, 1);
    f.pose = 'light3'; f.animationTime = 10;
    f.attack = { move: 'light', combo: 3, elapsed: .06, connected: false, queued: false };
    const first = spritePresentation(composed.metadata, f).frame.x;
    f.attack.elapsed = .15;
    const next = spritePresentation(composed.metadata, f).frame.x;
    const totals = ['light1','light2','light3'].map(id =>
      composed.metadata.clips[id].frames.reduce((sum, key) => sum + key.duration, 0));
    return {
      originalIdle: JSON.stringify(sampleFrame(base.metadata, 'idle', 0)) === JSON.stringify(sampleFrame(composed.metadata, 'idle', 0)),
      originalWalk: JSON.stringify(sampleFrame(base.metadata, 'walk', .18)) === JSON.stringify(sampleFrame(composed.metadata, 'walk', .18)),
      oneShots: ['light1','light2','light3'].every(id => !composed.metadata.clips[id].loop && composed.metadata.clips[id].frames.length === 6),
      totals, first, next, frameCount: Object.keys(composed.metadata.frames).length,
    };
  });
  expect(result.originalIdle).toBe(true);
  expect(result.originalWalk).toBe(true);
  expect(result.oneShots).toBe(true);
  expect(result.totals[0]).toBeCloseTo(.35);
  expect(result.totals[1]).toBeCloseTo(.35);
  expect(result.totals[2]).toBeCloseTo(.39);
  expect(result.frameCount).toBe(26);
  expect(result.first).toBe(720);
  expect(result.next).toBe(2880);
});
