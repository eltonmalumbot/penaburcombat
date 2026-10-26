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

test('on-screen combat buttons are available on desktop and mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  const pad = page.getByRole('region', { name: 'On-screen combat controls' });
  await expect(pad).toBeVisible();
  for (const key of ['a', 'd', 'w', 's', 'shift', 'j', 'k', 'l', 'u']) {
    const control = page.getByRole('button', { name: `Control ${key}`, exact: true });
    await expect(control).toBeVisible();
  }
  await expect(pad.getByText('MOVEMENT')).toBeVisible();
  await expect(pad.getByText('ATTACK')).toBeVisible();
  await page.getByRole('button', { name: 'Control j', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pad).toBeVisible();
  await expect(page.getByRole('button', { name: 'Control u', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('responsive gamepad fits portrait and landscape phone sizes without clipped controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  const gamepad = page.getByRole('region', { name: 'On-screen combat controls' });
  await expect(gamepad).toBeVisible();
  await expect(page.locator('.rotate-hint')).toBeVisible();
  for (const [key, label] of [['j', 'LIGHT'], ['k', 'HEAVY'], ['l', 'SKILL'], ['u', 'ULTIMATE']]) {
    await expect(page.getByRole('button', { name: `Control ${key}`, exact: true }).locator('.touch-label')).toHaveText(label);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.fight-page .game-wrap')).toBeVisible();
  await expect(gamepad).toBeVisible();
  await expect(page.locator('.top')).toBeHidden();
  await expect(page.locator('.rotate-hint')).toBeHidden();
  for (const key of ['a', 'd', 'w', 's', 'shift', 'j', 'k', 'l', 'u']) {
    const target = page.getByRole('button', { name: `Control ${key}`, exact: true });
    await expect(target).toBeVisible();
    const bounds = await target.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);
    expect(bounds!.y).toBeGreaterThanOrEqual(-1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(845);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(391);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(true);
  await page.getByRole('button', { name: 'Control j', exact: true }).click();
  await page.getByRole('button', { name: 'Control s', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(gamepad).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('mobile Chromium touch emulation', () => {
  test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2, viewport: { width: 844, height: 390 } });

  test('touch taps and simultaneous movement + light attack remain responsive', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await start(page);
    const move = page.getByRole('button', { name: 'Control d', exact: true });
    const light = page.getByRole('button', { name: 'Control j', exact: true });
    const guard = page.getByRole('button', { name: 'Control s', exact: true });
    await move.tap();
    await guard.tap();
    await light.tap();
    const moveBox = await move.boundingBox(), lightBox = await light.boundingBox();
    expect(moveBox).not.toBeNull(); expect(lightBox).not.toBeNull();
    const center = (box: NonNullable<typeof moveBox>) =>
      ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
      { ...center(moveBox!), id: 1 }, { ...center(lightBox!), id: 2 },
    ] });
    // Both pointers must remain independently pressed until release.
    await expect(move).toHaveClass(/is-held/);
    await expect(light).toHaveClass(/is-held/);
    await page.waitForTimeout(100);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(move).not.toHaveClass(/is-held/);
    await expect(light).not.toHaveClass(/is-held/);
    await expect(page.locator('#game')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
});

test('gamepad feedback resets on focus loss, and optional fullscreen leaves layout intact', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 844, height: 390 });
  await start(page);
  const guard = page.getByRole('button', { name: 'Control s', exact: true });
  const box = await guard.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(guard).toHaveClass(/is-held/);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(guard).not.toHaveClass(/is-held/);
  await page.mouse.up();
  await expect(page.locator('.match-status')).toHaveAttribute('data-paused', 'true');

  const fullscreen = page.getByRole('button', { name: 'FULL SCREEN', exact: true });
  const supportsFullscreen = await page.evaluate(() =>
    document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function');
  if (supportsFullscreen) {
    await expect(fullscreen).toBeVisible();
    await fullscreen.click();
    await expect(page.locator('#game')).toBeVisible();
  } else await expect(fullscreen).toHaveCount(0);
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SELECT FIGHTER' })).toBeVisible();
  await expect(page.locator('#app')).not.toHaveClass(/in-fight/);
  expect(errors).toEqual([]);
});

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


test.describe('Control System V2 touch and layout', () => {
  test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2, viewport: { width: 844, height: 390 } });

  test('reliable thumb glide between D-pad directions while attack controls stay independent', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await start(page);
    const left = page.getByRole('button', { name: 'Control a', exact: true });
    const right = page.getByRole('button', { name: 'Control d', exact: true });
    const light = page.getByRole('button', { name: 'Control j', exact: true });
    const origin = await left.boundingBox(), destination = await right.boundingBox(), attack = await light.boundingBox();
    expect(origin && destination && attack).toBeTruthy();
    const center = (b: NonNullable<typeof origin>) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
    const session = await page.context().newCDPSession(page);
    const startPoint = { ...center(origin!), id: 1 };
    const movePoint = { ...center(destination!), id: 1 };
    const attackPoint = { ...center(attack!), id: 2 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [startPoint] });
    await expect(left).toHaveClass(/is-held/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [movePoint] });
    await expect(left).not.toHaveClass(/is-held/);
    await expect(right).toHaveClass(/is-held/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [movePoint, attackPoint] });
    await expect(light).toHaveClass(/is-held/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(right).not.toHaveClass(/is-held/);
    await expect(light).not.toHaveClass(/is-held/);
    expect(errors).toEqual([]);
  });

  test('size preference persists and large phone layout keeps action targets separated', async ({ page }) => {
    await start(page);
    const control = page.getByRole('button', { name: 'Control size' });
    const pad = page.getByRole('region', { name: 'On-screen combat controls' });
    await expect(control).toHaveText('PAD: NORMAL');
    await control.click();
    await expect(pad).toHaveAttribute('data-size', 'large');
    const names = ['j', 'k', 'l', 'u'];
    const boxes = await Promise.all(names.map(name => page.getByRole('button', { name: 'Control ' + name, exact: true }).boundingBox()));
    for (const box of boxes) {
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(845);
      expect(box!.y + box!.height).toBeLessThanOrEqual(391);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
        * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      expect(intersection, names[i] + '/' + names[j] + ' overlap').toBeLessThan(25);
    }
    await page.reload();
    await start(page);
    await expect(page.getByRole('region', { name: 'On-screen combat controls' })).toHaveAttribute('data-size', 'large');
    await page.getByRole('button', { name: 'Control size' }).click();
    await expect(page.getByRole('region', { name: 'On-screen combat controls' })).toHaveAttribute('data-size', 'compact');
  });
});


test('V2 attack buttons reveal meter readiness without disabling safe no-op inputs', async ({ page }) => {
  await start(page);
  const skill = page.getByRole('button', { name: 'Control l', exact: true });
  const ultimate = page.getByRole('button', { name: 'Control u', exact: true });
  await expect(skill).toHaveAttribute('data-ready', 'false');
  await expect(ultimate).toHaveAttribute('data-ready', 'false');
  await expect(skill).toHaveAttribute('aria-description', 'Requires 20 meter');
  await expect(ultimate).toHaveAttribute('aria-description', 'Requires 65 meter');
  await expect(skill).toBeEnabled();
  await expect(ultimate).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Control j', exact: true })).toHaveAttribute('title', /three hits/);
});

test('V2 mobile presets keep essential controls inside real-size portrait and landscape viewports', async ({ page }) => {
  await start(page);
  const size = page.getByRole('button', { name: 'Control size' });
  const gamepad = page.getByRole('region', { name: 'On-screen combat controls' });
  await size.click(); // large: worst-case control footprint
  await expect(gamepad).toHaveAttribute('data-size', 'large');
  for (const viewport of [{ width: 320, height: 640 }, { width: 667, height: 375 },
    { width: 844, height: 390 }, { width: 932, height: 430 }]) {
    await page.setViewportSize(viewport);
    for (const key of ['a', 'd', 'w', 's', 'shift', 'j', 'k', 'l', 'u']) {
      const target = page.getByRole('button', { name: `Control ${key}`, exact: true });
      await expect(target).toBeVisible();
      const b = await target.boundingBox();
      expect(b).not.toBeNull();
      expect(b!.x, `${viewport.width}px ${key} x`).toBeGreaterThanOrEqual(-1);
      expect(b!.x + b!.width, `${viewport.width}px ${key} right`).toBeLessThanOrEqual(viewport.width + 1);
      // Portrait can scroll below the arena; landscape must keep controls on-screen.
      if (viewport.width > viewport.height) {
        expect(b!.y, `${viewport.width}px ${key} y`).toBeGreaterThanOrEqual(-1);
        expect(b!.y + b!.height, `${viewport.width}px ${key} bottom`).toBeLessThanOrEqual(viewport.height + 1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('practice combos mode is playable and does not leak into VS CPU', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await expect(page.getByRole('button', { name: 'PRACTICE COMBOS' })).toBeVisible();
  await page.getByRole('button', { name: 'PRACTICE COMBOS' }).click();
  const status = page.locator('.match-status');
  await expect(status).toHaveAttribute('data-mode', 'practice');
  await expect(page.getByRole('button', { name: 'RESET DUMMY' })).toBeVisible();
  await page.clock.runFor(2150);
  await expect(status).toHaveAttribute('data-phase', 'active');
  await page.keyboard.press('j');
  await page.clock.runFor(420);
  expect(Number(await status.getAttribute('data-practice-hits'))).toBeGreaterThanOrEqual(1);
  expect(Number(await status.getAttribute('data-practice-damage'))).toBeGreaterThanOrEqual(7);
  await page.getByRole('button', { name: 'RESET DUMMY' }).click();
  await expect(status).toHaveAttribute('data-practice-hits', '0');
  await expect(status).toHaveAttribute('data-practice-damage', '0');
  await expect(status).toHaveAttribute('data-player-health', '100');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(status).toHaveAttribute('data-mode', 'vs');
  await expect(page.getByRole('button', { name: 'RESET DUMMY' })).toHaveCount(0);
  await page.clock.runFor(2100);
  await expect(status).toHaveAttribute('data-phase', 'active');
  expect(errors).toEqual([]);
});

test('practice options let players train blocked hits and ultimate with full meter', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'PRACTICE COMBOS' }).click();
  const status = page.locator('.match-status');
  const guard = page.getByRole('button', { name: 'DUMMY: FREE' });
  const meter = page.getByRole('button', { name: 'METER: NORMAL' });
  await expect(guard).toHaveAttribute('aria-pressed', 'false');
  await expect(meter).toHaveAttribute('aria-pressed', 'false');
  await guard.click();
  await expect(page.getByRole('button', { name: 'DUMMY: GUARD' })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toHaveAttribute('data-dummy-guard', 'true');
  await meter.click();
  await expect(page.getByRole('button', { name: 'METER: ∞' })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toHaveAttribute('data-infinite-meter', 'true');
  await expect(status).toHaveAttribute('data-player-meter', '100');
  await page.clock.runFor(2050);
  await expect(status).toHaveAttribute('data-phase', 'active');
  await page.keyboard.press('k');
  await page.clock.runFor(600);
  await expect(status).toHaveAttribute('data-practice-damage', '3');
  await page.getByRole('button', { name: 'DUMMY: GUARD' }).click();
  await page.getByRole('button', { name: 'RESET DUMMY' }).click();
  await page.keyboard.press('u');
  await page.clock.runFor(550);
  await expect(status).toHaveAttribute('data-player-meter', '100');
  await expect(status).toHaveAttribute('data-practice-damage', '35');
  await page.getByRole('button', { name: 'EXIT', exact: true }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();
  await expect(status).toHaveAttribute('data-mode', 'vs');
  await expect(page.getByRole('button', { name: 'DUMMY: GUARD' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'METER: ∞' })).toHaveCount(0);
});

test('practice guard and meter toggles stay inside narrow mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'ALI READY', exact: true }).click();
  await page.getByRole('button', { name: 'PRACTICE COMBOS' }).click();
  for (const label of ['DUMMY: FREE', 'METER: NORMAL']) {
    const control = page.getByRole('button', { name: label });
    await expect(control).toBeVisible();
    const rect = await control.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(-1);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(361);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
