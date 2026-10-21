import { test, expect } from '@playwright/test';

const observeSprites = () => {
  const original = CanvasRenderingContext2D.prototype.drawImage;
  const images = new Set<CanvasImageSource>();
  const state = { images: 0, rows: [] as number[], signs: [] as number[] };
  Object.assign(window, { hdSpriteQA: state });
  CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof original>) {
    const image = args[0];
    if (this.canvas.id === 'game' && image instanceof HTMLImageElement && image.naturalWidth === 1600 && image.naturalHeight === 1080) {
      images.add(image); state.images = images.size;
      if (!state.rows.includes(args[2])) state.rows.push(args[2]);
      const direction = Math.sign(this.getTransform().a);
      if (!state.signs.includes(direction)) state.signs.push(direction);
    }
    return original.apply(this, args);
  } as typeof original;
};

test('PENABUR branding, approved HD portraits and both fighters render actual sprite pixels', async ({ page, request }) => {
  const errors: string[] = [], failures: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(r.url()); });
  await page.addInitScript(observeSprites); await page.clock.install();
  await page.goto('/');
  await expect(page).toHaveTitle('PENABUR Combat — 16.59 — Fight for Friday!');
  await expect(page.getByRole('link', { name: 'PENABUR Combat', exact: true })).toBeVisible();
  await expect(page.locator('.tag')).toHaveText('16.59 — Fight for Friday!');
  await expect(page.locator('.poster-canvas')).toHaveAttribute('data-artwork', 'hd');
  await expect(page.locator('.foot')).toContainText('BUKAN PRODUK RESMI');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await expect(page.locator('.slot')).toHaveCount(7); await expect(page.locator('.slot:disabled')).toHaveCount(5);
  await expect(page.locator('.preview')).toHaveAttribute('data-artwork', 'hd');
  await expect(page.locator('.ultimate-name')).toHaveText('HEIST PROTOCOL');
  await page.getByRole('button', { name: 'ELTON READY', exact: true }).click();
  await expect(page.locator('.preview')).toHaveAttribute('data-artwork', 'hd');
  await expect(page.locator('.ultimate-name')).toHaveText('NIGHT DEPLOY');
  await page.getByRole('button', { name: 'FIGHT CPU' }).click(); await page.clock.runFor(2200);
  const drawn = await page.evaluate(() => (window as unknown as { hdSpriteQA: { images: number; rows: number[]; signs: number[] } }).hdSpriteQA);
  expect(drawn.images).toBe(2); expect(drawn.rows).toContain(0); expect(drawn.rows).toContain(540);
  expect(drawn.signs.sort()).toEqual([-1, 1]);
  for (const name of ['ali', 'elton']) {
    const response = await request.get(`/assets/fighters/${name}.json`); expect(response.ok()).toBe(true);
    const metadata = await response.json(); expect(metadata.clips.idle.frames).toHaveLength(1);
    expect(metadata.clips.walk.frames.map((f: { frame: string }) => f.frame)).toEqual(['walk-0', 'walk-1', 'walk-2', 'walk-1']);
    const png = await request.get(`/assets/fighters/${name}.png`); expect(png.ok()).toBe(true);
    expect(png.headers()['content-type']).toContain('image/png');
  }
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});

test('missing approved images retain drawn portraits and playable battle fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/assets/fighters/*.png', r => r.fulfill({ status: 404, body: 'Unavailable for fallback test' }));
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.addInitScript(observeSprites); await page.clock.install();
  await page.goto('/'); await expect(page.locator('.poster-canvas')).toHaveAttribute('data-artwork', 'fallback');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await expect(page.locator('.preview')).toHaveAttribute('data-artwork', 'fallback');
  await page.getByRole('button', { name: 'FIGHT CPU' }).click(); await page.clock.runFor(2100);
  // Observe first damage rather than sampling after a KO/round reset restores HP.
  for (let i = 0; i < 30; i++) {
    await page.clock.runFor(250);
    if (Number(await page.locator('.match-status').getAttribute('data-player-health')) < 100) break;
  }
  await expect(page.locator('.match-status')).toHaveAttribute('data-phase', 'active');
  expect(Number(await page.locator('.match-status').getAttribute('data-player-health'))).toBeLessThan(100);
  expect(await page.evaluate(() => (window as unknown as { hdSpriteQA: { images: number } }).hdSpriteQA.images)).toBe(0);
  expect(errors).toEqual([]);
});

test('Elton mobile HD match reaches KO, rounds, result and rematch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { let seed = 83; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32); });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.install(); await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ELTON READY', exact: true }).click();
  await expect(page.locator('.preview')).toHaveAttribute('data-artwork', 'hd');
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Control j', exact: true })).toBeVisible();
  let sawKO = false, sawRoundTwo = false;
  for (let i = 0; i < 90; i++) {
    await page.clock.runFor(1000);
    const status = page.locator('.match-status');
    if (await status.count()) { sawKO ||= await status.getAttribute('data-player-health') === '0'; sawRoundTwo ||= await status.getAttribute('data-round') === '2'; }
    if (await page.getByRole('button', { name: 'REMATCH', exact: true }).count()) break;
  }
  expect(sawKO).toBe(true); expect(sawRoundTwo).toBe(true);
  await expect(page.locator('.result .description')).toHaveText('ALI WINS • 0 — 2');
  await page.getByRole('button', { name: 'REMATCH', exact: true }).click();
  await expect(page.locator('.match-status')).toHaveAttribute('data-player-health', '100');
  await expect(page.locator('.match-status')).toContainText('score 0 to 0'); expect(errors).toEqual([]);
});
