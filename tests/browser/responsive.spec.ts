import { test, expect } from '@playwright/test';

test('mobile split controls keep independent simultaneous touch pointers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'START FIGHT' }).click();
  await page.getByRole('button', { name: 'FIGHT CPU' }).click();

  const pad = page.locator('.touch-pad');
  await expect(pad).toBeVisible();
  await expect(pad.locator('.touch-movement .touch')).toHaveCount(5);
  await expect(pad.locator('.touch-attacks .touch')).toHaveCount(4);
  await expect(pad.locator('.key-u')).toHaveCSS('grid-column-start', '2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const walk = page.getByRole('button', { name: 'Control d', exact: true });
  const punch = page.getByRole('button', { name: 'Control j', exact: true });
  // Chromium maps CDP touch ids to its own PointerEvent.pointerId values.
  // Capture the actual browser ids before checking release isolation.
  await walk.evaluate(node => node.addEventListener('pointerdown', e => { (node as HTMLElement).dataset.qaPointer = String(e.pointerId); }));
  await punch.evaluate(node => node.addEventListener('pointerdown', e => { (node as HTMLElement).dataset.qaPointer = String(e.pointerId); }));
  const left = await walk.boundingBox();
  const right = await punch.boundingBox();
  expect(left && right).toBeTruthy();
  const point = (box: NonNullable<typeof left>, id: number) =>
    ({ x: box.x + box.width / 2, y: box.y + box.height / 2, id });
  const first = point(left!, 11), second = point(right!, 12);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
    await expect(walk).toHaveClass(/is-pressed/);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
    await expect(punch).toHaveClass(/is-pressed/);
    // Releasing the punch must not release the still-held movement pointer.
    // CDP touchEnd represents changed contacts differently across Chromium versions.
    // Dispatch each captured pointer's release explicitly to verify isolation.
    const walkId = Number(await walk.getAttribute('data-qa-pointer'));
    const punchId = Number(await punch.getAttribute('data-qa-pointer'));
    expect(walkId).toBeGreaterThan(0);
    expect(punchId).toBeGreaterThan(0);
    expect(punchId).not.toBe(walkId);
    await punch.dispatchEvent('pointerup', { pointerId: punchId });
    await expect(punch).not.toHaveClass(/is-pressed/);
    await expect(walk).toHaveClass(/is-pressed/);
    await walk.dispatchEvent('pointercancel', { pointerId: walkId });
    await expect(walk).not.toHaveClass(/is-pressed/);
  } finally {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await cdp.detach();
  }
});
