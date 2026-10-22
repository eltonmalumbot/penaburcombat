import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine, FIXED_STEP } from '../src/game/engine.ts';
import { emptyInput } from '../src/game/types.ts';

function match(): CombatEngine {
  const e = new CombatEngine('Ali', { ai: false });
  e.state.phase = 'active';
  e.state.player.x = 500;
  e.state.cpu.x = 610;
  return e;
}
function run(e: CombatEngine, n: number) { for (let i = 0; i < n; i++) e.update(FIXED_STEP); }

test('late light input is buffered during attack recovery instead of dropped', () => {
  const e = match();
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'heavy' });
  run(e, 29);
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'light' });
  run(e, 10);
  assert.equal(e.state.player.attack?.move, 'light');
});
test('an expired attack buffer never becomes a surprise attack', () => {
  const e = match();
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'heavy' });
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'light' });
  run(e, 60);
  assert.equal(e.state.player.attack, null);
  assert.equal(e.state.player.bufferedAttack, null);
});
test('connected light may cancel into queued light only after the active window', () => {
  const e = match();
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'light' });
  run(e, 5);
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'light' });
  assert.equal(e.state.player.attack?.combo, 1);
  run(e, 9);
  assert.equal(e.state.player.attack?.combo, 2);
});
test('horizontal acceleration and braking are responsive and deterministic', () => {
  const e = match();
  e.state.cpu.x = 1100;
  e.update(FIXED_STEP, { ...emptyInput(), move: 1 });
  const firstSpeed = e.state.player.vx;
  assert.ok(firstSpeed > 0 && firstSpeed < 310);
  for (let i = 0; i < 8; i++) e.update(FIXED_STEP, { ...emptyInput(), move: 1 });
  assert.equal(e.state.player.vx, 310);
  e.update(FIXED_STEP);
  assert.ok(e.state.player.vx < 310);
  run(e, 8);
  assert.equal(e.state.player.vx, 0);
});
test('taking a hit clears queued inputs so they cannot fire during stun', () => {
  const e = match();
  e.state.cpu.x = 575;
  e.update(FIXED_STEP, { ...emptyInput(), attack: 'heavy' }, { ...emptyInput(), attack: 'light' });
  run(e, 8);
  assert.ok(e.state.player.stun > 0);
  assert.equal(e.state.player.bufferedAttack, null);
});
