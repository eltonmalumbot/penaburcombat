import { test, expect } from '@playwright/test';

test('hit and block create visible feedback on the Canvas and expire without leaving trails', async ({ page }) => {
  await page.goto('/');
  const out = await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/render/renderer.ts' as string);
    const { CombatEngine } = await import('/src/game/engine.ts' as string);
    const canvas = document.createElement('canvas');
    canvas.style.width = '1280px'; document.body.append(canvas);
    const renderer = new GameRenderer(canvas);
    const state = new CombatEngine('Ali', { ai: false }).state;
    renderer.draw(state, 0, false);
    const baseline = canvas.toDataURL();

    renderer.effects([{ type: 'hit', x: 640, y: 390, color: '#39defa', blocked: false }]);
    renderer.draw(state, 0, false);
    const hitChanged = canvas.toDataURL() !== baseline;
    for (let i = 0; i < 5; i++) renderer.draw(state, .1, false);
    const hitCleared = canvas.toDataURL() === baseline;

    renderer.effects([{ type: 'hit', x: 640, y: 390, color: '#39defa', blocked: true }]);
    renderer.draw(state, 0, false);
    const blockChanged = canvas.toDataURL() !== baseline;
    for (let i = 0; i < 5; i++) renderer.draw(state, .1, false);
    const blockCleared = canvas.toDataURL() === baseline;
    return { hitChanged, hitCleared, blockChanged, blockCleared };
  });
  expect(out).toEqual({ hitChanged: true, hitCleared: true, blockChanged: true, blockCleared: true });
});

test('reduced-motion preference suppresses extra hit effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/render/renderer.ts' as string);
    const { CombatEngine } = await import('/src/game/engine.ts' as string);
    const canvas = document.createElement('canvas');
    canvas.style.width = '1280px'; document.body.append(canvas);
    const renderer = new GameRenderer(canvas);
    const state = new CombatEngine('Ali', { ai: false }).state;
    renderer.draw(state, 0, false);
    const original = canvas.toDataURL();
    renderer.effects([{ type: 'hit', x: 620, y: 390, color: '#39defa', blocked: false }]);
    renderer.draw(state, 0, false);
    return canvas.toDataURL() === original;
  });
  expect(result).toBe(true);
});
