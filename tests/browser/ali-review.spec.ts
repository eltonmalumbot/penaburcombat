import { test, expect } from '@playwright/test';

test('Ali candidate review is accessible but never auto-activates unapproved art', async ({ page, request }) => {
  const source = await request.get('/review/ali-combo-v2.html');
  expect(source.status()).toBe(200);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/review/ali-combo-v2.html');
  await expect(page.getByRole('heading', { name: 'Ali Light Combo V2 — Visual Review' })).toBeVisible();
  await expect(page.getByText('KANDIDAT BELUM DISETUJUI.')).toBeVisible();
  await expect(page.locator('#atlas')).toBeVisible();
  await expect(page.locator('#toggle')).toBeDisabled();
  await expect(page.locator('#step')).toBeDisabled();
  await expect(page.locator('#scene')).toBeVisible();
  expect(await request.get('/assets/fighters/ali.png').then(response => response.ok())).toBe(true);
  await expect(page.locator('#status')).toContainText('Belum ada PNG kandidat');
  expect(errors).toEqual([]);
});

test('wrong local candidate file is rejected by checksum and cannot enable playback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/review/ali-combo-v2.html');
  await page.locator('#atlas').setInputFiles({
    name: 'ali-combat-frames.png', mimeType: 'image/png',
    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
  });
  await expect(page.locator('#status')).toContainText('SHA-256 tidak cocok');
  await expect(page.locator('#status')).toHaveAttribute('data-error', 'true');
  await expect(page.locator('#toggle')).toBeDisabled();
  await expect(page.locator('#step')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('review UI supports comparison controls and local JSON report without changing production metadata', async ({ page }) => {
  await page.goto('/review/ali-combo-v2.html');
  await page.locator('#clip').selectOption('light3');
  await page.locator('#reverse').check();
  await page.locator('#guide').uncheck();
  await page.locator('#notes').fill('Light 1 frame 4 and Light 2 frame 4: cyan effect touches right edge.');
  await page.locator('input.qa-check[value="identity"]').check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Simpan laporan review (.json)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('ali-light-combo-v2-review.json');
  await expect(page.locator('#frame')).toContainText('Kandidat belum dimuat');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'START FIGHT' })).toBeVisible();
});
