import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

/** Exercise the real input module using touch PointerEvents in a browser. */
test('double-tap Dash needs two finished taps, not two simultaneous fingers', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    const input = new InputController(() => {}, () => {}, () => {});
    const a = document.createElement('button');
    a.dataset.key = 'a'; a.className = 'touch'; document.body.append(a);
    input.bind(a, 'a'); input.setEnabled(true);
    const emit = (type: string, id: number, x = 50) => a.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', clientX: x, clientY: 50, bubbles: true, cancelable: true,
    }));
    emit('pointerdown', 101);
    const firstDown = input.sample();
    emit('pointerdown', 102);
    const simultaneous = input.sample();
    emit('pointerup', 101);
    emit('pointerup', 102);
    input.sample();
    // Two short completed taps should be interpreted as a dash.
    emit('pointerdown', 103);
    const ordinary = input.sample();
    emit('pointerup', 103);
    emit('pointerdown', 104);
    const doubleTap = input.sample();
    emit('pointerup', 104);
    const notSticky = input.sample();
    input.clear();
    return {
      firstDash: firstDown.dash,
      simultaneousDash: simultaneous.dash,
      ordinaryDash: ordinary.dash,
      actualDash: doubleTap.dash,
      afterRelease: notSticky.dash,
      heldClassCleared: !a.classList.contains('is-held'),
    };
  });
  expect(values).toEqual({
    firstDash: false, simultaneousDash: false, ordinaryDash: false,
    actualDash: true, afterRelease: false, heldClassCleared: true,
  });
});

test('slow hold, cancelled touch and moving finger must not arm a Dash', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    const input = new InputController(() => {}, () => {}, () => {});
    const a = document.createElement('button'); a.dataset.key = 'a'; a.className = 'touch';
    document.body.append(a); input.bind(a, 'a'); input.setEnabled(true);
    const emit = (type: string, id: number, x = 50) => a.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', clientX: x, clientY: 50, bubbles: true, cancelable: true,
    }));
    emit('pointerdown', 1);
    emit('pointerup', 1, 100); // Not a tap: moved too far.
    emit('pointerdown', 2);
    const afterDrag = input.sample().dash; emit('pointercancel', 2);
    emit('pointerdown', 3);
    const afterCancel = input.sample().dash;
    input.clear(); // Pause, background or navigation must reset gestures.
    emit('pointerdown', 4);
    const afterClear = input.sample().dash;
    input.clear();
    return { afterDrag, afterCancel, afterClear, held: a.classList.contains('is-held') };
  });
  expect(values).toEqual({ afterDrag: false, afterCancel: false, afterClear: false, held: false });
});

test('keyboard and on-screen controls preserve the same move/guard priorities', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    const input = new InputController(() => {}, () => {}, () => {});
    const d = document.createElement('button'), light = document.createElement('button');
    document.body.append(d, light); input.bind(d, 'd'); input.bind(light, 'j');
    input.setEnabled(true);
    const touch = (button: HTMLButtonElement, type: string, id: number) => button.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true,
    }));
    touch(d, 'pointerdown', 12); touch(light, 'pointerdown', 13);
    const both = input.sample();
    const held = input.sample();
    touch(d, 'pointerup', 12); touch(light, 'pointerup', 13);
    const released = input.sample();
    return {
      movementAndAttack: both.move === 1 && both.attack === 'light',
      attackIsOneShot: held.move === 1 && held.attack === null,
      released: released.move === 0 && released.attack === null,
    };
  });
  expect(values).toEqual({ movementAndAttack: true, attackIsOneShot: true, released: true });
});
