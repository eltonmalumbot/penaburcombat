import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test('production build exposes a verifiable commit identity', async ({ request }) => {
  const response = await request.get('/build-info.json');
  expect(response.ok()).toBe(true);
  const info = await response.json();
  expect(info.name).toBe('penaburcombat'); expect(info.commit).toMatch(/^[a-f0-9]{40}$/);
  if (process.env.EXPECTED_DEPLOY_SHA) expect(info.commit).toBe(process.env.EXPECTED_DEPLOY_SHA);
});

async function start(page: Page, fighter: 'Ali' | 'Elton' = 'Ali') {
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await expect(page.locator('.slot')).toHaveCount(7);
  await expect(page.locator('.slot:disabled')).toHaveCount(5);
  await page.getByRole('button', { name: `${fighter.toUpperCase()} READY`, exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(page.locator('#game')).toBeVisible();
}

test('desktop controls, combat, pause and clearing held input on exit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.clock.install();
  await start(page, 'Elton');
  const status = page.locator('.match-status');
  await page.clock.runFor(2100);
  await expect(status).toHaveAttribute('data-phase', 'active');
  await expect(status).toContainText('Elton health 100');
  // Keep approaching during the combo: real AI knockback can otherwise leave a
  // stationary player out of light-attack range, making this input check random.
  await page.keyboard.down('d'); await page.clock.runFor(600);
  for (let i = 0; i < 20; i++) { await page.keyboard.press('j'); await page.clock.runFor(130); }
  await page.keyboard.up('d');
  expect(Number(await status.getAttribute('data-cpu-health'))).toBeLessThan(100);
  await page.keyboard.press('p');
  const timer = await status.getAttribute('data-timer');
  const health = await status.getAttribute('data-player-health');
  await page.clock.runFor(3000);
  await expect(status).toHaveAttribute('data-timer', timer!);
  await expect(status).toHaveAttribute('data-player-health', health!);
  await page.keyboard.press('p'); await page.clock.runFor(1200);
  expect(Number(await status.getAttribute('data-timer'))).toBeLessThan(Number(timer));
  // Blur pauses, clears held input, and must never auto-resume on focus.
  await page.keyboard.down('d');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('d');
  await expect(status).toHaveAttribute('data-paused', 'true');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(status).toContainText('Ali health 100');
  await expect(status).toHaveAttribute('data-round', '1');
  await expect(status).toHaveAttribute('data-paused', 'false');
  expect(errors).toEqual([]);
});

test('a full CPU match reaches two KOs, result, rematch and fighter change', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Seed only randomness; play through real input, timing, rendering and match transitions.
  await page.addInitScript(() => {
    let seed = 83;
    Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  });
  await page.clock.install(); await start(page);
  let sawRoundTwo = false, sawKO = false;
  for (let i = 0; i < 90; i++) {
    await page.clock.runFor(1000);
    const status = page.locator('.match-status');
    if (await status.count()) {
      sawRoundTwo ||= (await status.getAttribute('data-round')) === '2';
      sawKO ||= (await status.getAttribute('data-player-health')) === '0';
    }
    if (await page.getByRole('button', { name: 'REMATCH', exact: true }).count()) break;
  }
  expect(sawRoundTwo).toBe(true); expect(sawKO).toBe(true);
  await expect(page.getByRole('heading', { name: 'DEFEAT', exact: true })).toBeVisible();
  await expect(page.locator('.result .description')).toContainText('ELTON WINS • 0 — 2');
  await page.getByRole('button', { name: 'REMATCH', exact: true }).click();
  await expect(page.locator('.match-status')).toContainText('score 0 to 0');
  await expect(page.locator('.match-status')).toHaveAttribute('data-player-health', '100');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SELECT FIGHTER', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile layout, touch guard and pointer cancellation remain usable after resizing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install(); await start(page);
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Control j', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Control shift', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const guard = page.getByRole('button', { name: 'Control s', exact: true });
  const box = await guard.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down(); await page.clock.runFor(3000); await page.mouse.up();
  await guard.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.getByRole('button', { name: 'Control w', exact: true }).click();
  await page.clock.runFor(1000);
  await page.setViewportSize({ width: 1280, height: 800 });
  const arena = await page.locator('#game').boundingBox();
  expect(arena!.width / arena!.height).toBeCloseTo(16 / 9, 1);
  await expect(page.locator('.match-status')).toHaveAttribute('data-phase', 'active');
  expect(errors).toEqual([]);
});

test('player combos earn meter for skill and ultimate before a complete victory', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // A repeatable aggressive opponent still uses the normal AI; there is no game-state injection.
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.clock.install(); await start(page);
  const status = page.locator('.match-status');
  await page.clock.runFor(2100);
  await page.keyboard.down('d'); await page.clock.runFor(800);
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press('j'); await page.clock.runFor(130);
    if (Number(await status.getAttribute('data-player-meter')) >= 65) break;
  }
  expect(Number(await status.getAttribute('data-player-meter'))).toBeGreaterThanOrEqual(65);
  await page.keyboard.down('s'); await page.clock.runFor(600); await page.keyboard.up('s');
  await page.keyboard.press('w'); await page.clock.runFor(140);
  let meter = Number(await status.getAttribute('data-player-meter'));
  let skillUsed = false;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('l'); await page.clock.runFor(100);
    if (Number(await status.getAttribute('data-player-meter')) < meter) { skillUsed = true; break; }
  }
  expect(skillUsed).toBe(true);
  await page.clock.runFor(800);
  for (let i = 0; i < 15; i++) {
    if (Number(await status.getAttribute('data-player-meter')) >= 65) break;
    await page.keyboard.press('j'); await page.clock.runFor(130);
  }
  expect(Number(await status.getAttribute('data-player-meter'))).toBeGreaterThanOrEqual(65);
  await page.keyboard.down('s'); await page.clock.runFor(600); await page.keyboard.up('s');
  await page.keyboard.press('w'); await page.clock.runFor(140);
  meter = Number(await status.getAttribute('data-player-meter'));
  let ultimateUsed = false;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('u'); await page.clock.runFor(100);
    // Receiving a hit can replenish meter in the same sampling interval; the announcement
    // confirms activation while the unit suite verifies the exact 65-point cost.
    if ((await page.getByRole('status').textContent())?.includes('ALI ULTIMATE!')) { ultimateUsed = true; break; }
  }
  expect(ultimateUsed).toBe(true);
  await page.clock.runFor(1400);
  // Finish both rounds with real keyboard combos, following the CPU towards the corner.
  for (let i = 0; i < 240; i++) {
    if (await page.getByRole('button', { name: 'REMATCH', exact: true }).count()) break;
    await page.keyboard.press('j'); await page.clock.runFor(130);
  }
  await page.keyboard.up('d');
  await expect(page.getByRole('heading', { name: 'VICTORY!', exact: true })).toBeVisible();
  await expect(page.locator('.result .description')).toContainText('ALI WINS • 2 — 0');
  await page.getByRole('button', { name: 'REMATCH', exact: true }).click();
  await expect(status).toHaveAttribute('data-player-meter', '0');
  expect(errors).toEqual([]);
});
