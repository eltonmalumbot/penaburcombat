import { test, expect } from '@playwright/test';

test('Alpha seam reviewer flags internal hard cuts that ordinary 12px edge tests miss', async ({ page }) => {
  await page.goto('/review/ali-combo-v2.html');
  const result = await page.evaluate(async () => {
    const { detectHardCuts } = await import('/review/alpha-seam-qa.js' as string);
    const canvas = document.createElement('canvas');
    canvas.width = 4320; canvas.height = 1620;
    const ctx = canvas.getContext('2d')!;
    // Alpha crop is 90px inside the left edge; the old near-border check
    // would report nothing even though both vertical edges are razor sharp.
    ctx.fillStyle = '#4edbee';
    ctx.fillRect(90, 200, 130, 180);
    const image = new Image();
    image.src = canvas.toDataURL('image/png');
    await image.decode();
    const list = detectHardCuts(image);
    return { count: list.length, flagged: list.filter((x: { needsReview: boolean }) => x.needsReview).length,
      first: list[0], second: list[1] };
  });
  expect(result.count).toBe(18);
  expect(result.flagged).toBe(1);
  expect(result.first.clip).toBe('light1');
  expect(result.first.frame).toBe(1);
  expect(result.first.seams.map((x: { x: number }) => x.x)).toEqual([90, 220]);
  expect(result.first.bottomAlphaY).toBe(379);
  expect(result.second.needsReview).toBe(false);
});

test('Reviewer does not claim art QA results before a checksum-verified image loads', async ({ page }) => {
  await page.goto('/review/ali-combo-v2.html');
  await expect(page.locator('#hardcut-panel')).toBeHidden();
  await expect(page.locator('#toggle')).toBeDisabled();
  await page.locator('#atlas').setInputFiles({
    name:'ali-combat-frames.png', mimeType:'image/png',
    buffer: Buffer.alloc(256,0xee),
  });
  await expect(page.locator('#status')).toContainText('SHA-256 tidak cocok');
  await expect(page.locator('#hardcut-panel')).toBeHidden();
  await expect(page.locator('#toggle')).toBeDisabled();
});
