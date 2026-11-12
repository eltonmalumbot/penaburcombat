import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Synthetic rectangles validate controls/integrity only, never Elton artwork.
let root: string;
test.beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'elton-review-browser-'));
  execFileSync(process.env.ART_PYTHON || 'python', ['-c', `
import sys, shutil
sys.path.insert(0, 'tests')
from test_elton_art_pipeline import EltonArtIntakeTests as T
T.setUpClass()
try: shutil.copytree(T.candidate, sys.argv[1], dirs_exist_ok=True)
finally: T.tearDownClass()
`, root], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
});
test.afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

test('SYNTHETIC Elton offline reviewer pins bytes, steps, mirrors, plays all timings and clears rejected art', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.route('**/elton-synthetic-review', async route => {
    await route.fulfill({ contentType: 'text/html', body: await readFile(join(root, 'review.html'), 'utf8') });
  });
  await page.goto('/elton-synthetic-review');
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#file').setInputFiles(join(root, 'elton-combat-frames.png'));
  await expect(page.locator('#status')).toContainText('SHA-256 verified; ART NOT APPROVED');
  for (const move of ['light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate']) {
    for (const left of [false, true]) {
      await page.locator('#move').selectOption(move);
      await page.locator('#left').setChecked(left);
      for (let i = 1; i <= 6; i++) {
        await expect(page.locator('#frame')).toContainText(`${i}/6`);
        if (i < 6) await page.locator('#step').click();
      }
      for (const rate of ['1', '0.5', '0.25']) {
        await page.locator('#speed').selectOption(rate);
        await page.locator('#play').click();
        await page.clock.runFor(1300 / Number(rate));
        await expect(page.locator('#frame')).toContainText('6/6');
        await expect(page.locator('#play')).toHaveText('Play');
      }
    }
  }
  const bytes = await readFile(join(root, 'elton-combat-frames.png'));
  await page.locator('#file').setInputFiles({ name: 'tampered.png', mimeType: 'image/png', buffer: Buffer.concat([bytes, Buffer.from('tampered')]) });
  await expect(page.locator('#status')).toContainText('SHA-256 mismatch');
  await expect(page.locator('#play')).toBeDisabled();
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext('2d')!.getImageData(0, 0, 720, 540).data.every(value => value === 0))).toBe(true);
  await page.locator('#reset').click();
  await expect(page.locator('#status')).toHaveText('No candidate loaded');
});
