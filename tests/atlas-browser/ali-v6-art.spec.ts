import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const atlasPath = resolve('art-review/ali-light3-v6/candidate/ali-combat-frames.png');
test.setTimeout(120_000); // Real HD decoding, screenshots and slow-motion playback.

test('real V6 atlas steps F3-F6 both ways and plays at 1x, .5x and .25x', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/review/ali-combo-v2.html');
  await page.locator('#atlas').setInputFiles(atlasPath);
  await expect(page.locator('#edition')).toContainText('V6 AI redraw');
  await page.locator('#clip').selectOption('light3');
  for (const left of [false, true]) {
    await page.locator('#reverse').setChecked(left);
    await page.locator('#clip').selectOption('light1');
    await page.locator('#clip').selectOption('light3');
    for (let frame = 2; frame <= 6; frame++) {
      await page.locator('#step').click();
      await expect(page.locator('#frame')).toContainText(`Frame ${frame}/6`);
      if (frame >= 3) await page.locator('#scene').screenshot({ path: info.outputPath(`V6-${left ? 'left' : 'right'}-F${frame}.png`) });
    }
    for (const rate of [1, .5, .25]) {
      await page.locator('#clip').selectOption('light1');
      await page.locator('#clip').selectOption('light3');
      await page.locator('#speed').selectOption(rate === 1 ? '1' : String(rate).slice(1));
      await page.locator('#loop').uncheck();
      await page.locator('#toggle').click();
      await page.clock.runFor(500 / rate);
      await expect(page.locator('#frame')).toContainText('Frame 6/6');
      await expect(page.locator('#toggle')).toHaveText('Mainkan');
    }
  }
  // The actual PNG goes through the same checksum gate used by the game.
  const result = await page.evaluate(async () => {
    const { loadAliForReview } = await import('/src/animation/review-ali.ts' as string);
    const { drawFighter } = await import('/src/render/renderer.ts' as string);
    const { createFighter } = await import('/src/game/characters.ts' as string);
    const file = (document.querySelector('#atlas') as HTMLInputElement).files![0];
    const { atlas, edition } = await loadAliForReview(file);
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 540;
    const ctx = canvas.getContext('2d')!;
    let images = 0;
    const draw = ctx.drawImage.bind(ctx);
    ctx.drawImage = ((...args: Parameters<typeof ctx.drawImage>) => { images++; draw(...args); }) as typeof ctx.drawImage;
    for (const face of [-1, 1]) for (const elapsed of [.10, .13, .18, .3]) {
      const f = createFighter('Ali', 320, face); f.pose = 'light3'; f.animationTime = 99;
      f.attack = { move: 'light', combo: 3, elapsed, connected: false, queued: false };
      const before = JSON.stringify(f);
      drawFighter(ctx, f, 1, atlas);
      if (JSON.stringify(f) !== before) throw Error('Real art rendering mutated fighter');
    }
    return { edition, images };
  });
  expect(result).toEqual({ edition: 'V6', images: 8 });
  expect(errors).toEqual([]);
});

for (const practice of [false, true]) for (const rate of [1, .5, .25]) {
  test(`real V6 Light3 contact/follow-through renders in ${practice ? 'practice' : 'VS'} at ${rate}x`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { Math.random = () => .99; });
    await page.clock.install();
    await page.goto('/?aliArtReview=v6');
    await page.getByRole('button', { name: 'START FIGHT' }).click();
    await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
    await page.getByRole('button', { name: practice ? 'PRACTICE COMBOS' : 'FIGHT CPU →', exact: true }).click();
    await page.locator('#ali-v3-local-file').setInputFiles(atlasPath);
    await expect(page.locator('#ali-v3-review-status')).toContainText('V6 berhasil dimuat');
    await page.clock.runFor(2100);
    await page.locator('#ali-review-speed').selectOption(String(rate));
    await page.evaluate(() => {
      const seen: number[] = [];
      Object.assign(window, { v6Crops: seen });
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...args: Parameters<typeof draw>) {
        const source = args[0];
        if (source instanceof HTMLImageElement && source.naturalWidth === 4320 && args[2] === 1080) seen.push(args[1] as number);
        return draw.apply(this, args);
      } as typeof draw;
    });
    if (!practice) { await page.keyboard.down('d'); await page.clock.runFor(800 / rate); }
    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('j'); await page.clock.runFor(100 / rate);
    }
    await page.keyboard.up('d');
    const seen = await page.evaluate(() => (window as unknown as { v6Crops: number[] }).v6Crops);
    expect(seen).toContain(2160); // F4/contact from the real V6 image, not idle fallback.
    expect(seen).toContain(2880); // F5/follow-through.
    await page.locator('#game').screenshot({ path: info.outputPath(`V6-${practice ? 'practice' : 'vs'}-${rate}x.png`) });
    await page.getByRole('button', { name: 'Kembalikan sprite Ali asli' }).click();
    await expect(page.locator('#ali-v3-review-status')).toContainText('Sprite Ali asli aktif kembali');
    expect(errors).toEqual([]);
  });
}
