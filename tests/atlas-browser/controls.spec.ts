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

test('cancelled touches discard pending attacks, jumps and double-tap dash', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    const input = new InputController(() => {}, () => {}, () => {});
    const make = (key: string) => {
      const button = document.createElement('button');
      button.className = 'touch'; button.dataset.key = key; document.body.append(button);
      input.bind(button, key);
      return button;
    };
    const j = make('j'), w = make('w'), a = make('a');
    const emit = (button: HTMLButtonElement, type: string, id: number) =>
      button.dispatchEvent(new PointerEvent(type, {
        pointerId: id, pointerType: 'touch', button: 0,
        clientX: 40, clientY: 40, bubbles: true, cancelable: true,
      }));
    input.setEnabled(true);
    emit(j, 'pointerdown', 101); emit(j, 'pointercancel', 101);
    const cancelledAttack = input.sample().attack;
    emit(w, 'pointerdown', 102); emit(w, 'lostpointercapture', 102);
    const captureLostJump = input.sample().jump;
    // A completed press must remain a genuine one-shot input.
    emit(j, 'pointerdown', 103); emit(j, 'pointerup', 103);
    const completedAttack = input.sample().attack;
    const noAttackRepeat = input.sample().attack;
    // Complete a first direction tap, then cancel the second (dash) tap.
    emit(a, 'pointerdown', 104); input.sample(); emit(a, 'pointerup', 104);
    emit(a, 'pointerdown', 105); emit(a, 'pointercancel', 105);
    const cancelledDash = input.sample().dash;
    input.clear();
    return { cancelledAttack, captureLostJump, completedAttack, noAttackRepeat, cancelledDash };
  });
  expect(values).toEqual({
    cancelledAttack: null, captureLostJump: false, completedAttack: 'light',
    noAttackRepeat: null, cancelledDash: false,
  });
});

test('one cancelled finger cannot discard another finger or keyboard press', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    const input = new InputController(() => {}, () => {}, () => {});
    const j = document.createElement('button');
    j.className = 'touch'; j.dataset.key = 'j'; document.body.append(j);
    input.bind(j, 'j'); input.setEnabled(true);
    const touch = (type: string, id: number) => j.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', bubbles: true, cancelable: true,
    }));
    touch('pointerdown', 31); touch('pointerdown', 32); touch('pointercancel', 31);
    const survivingFinger = input.sample().attack;
    touch('pointerup', 32); input.sample();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', bubbles: true }));
    touch('pointerdown', 33); touch('pointercancel', 33);
    const survivingKeyboard = input.sample().attack;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'j', code: 'KeyJ', bubbles: true }));
    const noRepeat = input.sample().attack;
    input.clear();
    return { survivingFinger, survivingKeyboard, noRepeat };
  });
  expect(values).toEqual({
    survivingFinger: 'light', survivingKeyboard: 'light', noRepeat: null,
  });
});

test('retargeting a D-pad finger replaces stale input and pagehide clears everything', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    let backgrounded = 0;
    const input = new InputController(() => {}, () => {}, () => { backgrounded++; });
    const group = document.createElement('div');
    const a = document.createElement('button'), w = document.createElement('button');
    for (const [button, key] of [[a, 'a'], [w, 'w']] as const) {
      button.className = 'touch'; button.dataset.key = key; group.append(button);
      input.bind(button, key);
    }
    document.body.append(group);
    input.setEnabled(true);
    const emit = (type: string, id: number) => a.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', clientX: 80, clientY: 60,
      bubbles: true, cancelable: true,
    }));
    const original = document.elementFromPoint.bind(document);
    emit('pointerdown', 56);
    document.elementFromPoint = () => w;
    emit('pointermove', 56);
    const jumped = input.sample().jump;
    const movement = input.sample().move;
    window.dispatchEvent(new Event('pagehide'));
    const afterPagehide = input.sample();
    const clearedHeld = !a.classList.contains('is-held') && !w.classList.contains('is-held');
    document.elementFromPoint = original;
    input.clear();
    return { jumped, movement, afterPagehide, clearedHeld, backgrounded };
  });
  expect(values.jumped).toBe(true);
  expect(values.movement).toBe(0);
  expect(values.afterPagehide).toEqual({ move: 0, guard: false, jump: false, dash: false, attack: null });
  expect(values.clearedHeld).toBe(true);
  expect(values.backgrounded).toBe(1);
});

test('editing an art-review field never triggers movement, attacks or pause/exit shortcuts', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    let pauses = 0, exits = 0;
    const input = new InputController(() => { pauses++; }, () => { exits++; }, () => {});
    const field = document.createElement('input');
    field.type = 'file'; field.id = 'local-art-review';
    const select = document.createElement('select');
    select.innerHTML = '<option value="1">1×</option><option value=".5">0.5×</option>';
    const text = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.append(field, select, text, editable);
    input.setEnabled(true);
    const key = (target: HTMLElement, name: string, code: string) => {
      const event = new KeyboardEvent('keydown', {
        key: name, code, bubbles: true, cancelable: true,
      });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    field.focus();
    const filePrevented = key(field, 'Escape', 'Escape');
    key(field, 'p', 'KeyP');
    key(field, 'j', 'KeyJ');
    select.focus();
    const selectPrevented = key(select, 'ArrowLeft', 'ArrowLeft');
    key(select, ' ', 'Space');
    text.focus();
    key(text, 'w', 'KeyW');
    editable.focus();
    key(editable, 'u', 'KeyU');
    const whileEditing = input.sample();
    return { pauses, exits, filePrevented, selectPrevented, whileEditing };
  });
  expect(values).toEqual({
    pauses: 0, exits: 0, filePrevented: false, selectPrevented: false,
    whileEditing: { move: 0, guard: false, jump: false, dash: false, attack: null },
  });
});

test('focusing an editor clears pending combat edges but restores normal shortcuts afterward', async ({ page }) => {
  const values = await page.evaluate(async () => {
    const { InputController } = await import('/src/ui/input.ts' as string);
    let pauses = 0;
    const input = new InputController(() => { pauses++; }, () => {}, () => {});
    input.setEnabled(true);
    const emit = (name: string, code: string) =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: name, code, bubbles: true }));
    emit('d', 'KeyD');
    emit('j', 'KeyJ'); // Both pending and held until an editor takes focus.
    const editor = document.createElement('input');
    editor.type = 'text'; document.body.append(editor); editor.focus();
    const clearedOnFocus = input.sample();
    editor.blur();
    emit('j', 'KeyJ');
    const afterEditing = input.sample().attack;
    emit('p', 'KeyP');
    const afterPause = input.sample();
    input.clear();
    return { clearedOnFocus, afterEditing, afterPause, pauses };
  });
  expect(values).toEqual({
    clearedOnFocus: { move: 0, guard: false, jump: false, dash: false, attack: null },
    afterEditing: 'light',
    afterPause: { move: 0, guard: false, jump: false, dash: false, attack: null },
    pauses: 1,
  });
});
