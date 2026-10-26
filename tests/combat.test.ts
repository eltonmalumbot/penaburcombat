import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine, FIXED_STEP } from '../src/game/engine.ts';
import { emptyInput } from '../src/game/types.ts';
import type { CombatInput } from '../src/game/types.ts';
import { ARENA } from '../src/game/geometry.ts';
import { createBrain, decideAI } from '../src/game/ai.ts';
import { ROSTER } from '../src/game/characters.ts';

const input = (overrides: Partial<CombatInput> = {}): CombatInput => ({ ...emptyInput(), ...overrides });
function active(): CombatEngine {
  const engine = new CombatEngine('Ali', { ai: false });
  engine.state.phase = 'active'; engine.state.player.x = 500; engine.state.cpu.x = 610;
  return engine;
}
function frames(engine: CombatEngine, count: number, player = input(), cpu = input()): void {
  for (let i = 0; i < count; i++) engine.update(FIXED_STEP, player, cpu);
}

test('seven roster slots retain only Ali and Elton as playable fighters', () => {
  assert.deepEqual(ROSTER.map(f => f.id), ['Ali', 'Patrick', 'Niko', 'Marco', 'Lia', 'Kris', 'Elton']);
  assert.deepEqual(ROSTER.filter(f => f.available).map(f => f.id), ['Ali', 'Elton']);
  assert.throws(() => new CombatEngine('Patrick'), /not playable/);
});
test('countdown rejects attacks, jumping and dashing', () => {
  const e = new CombatEngine('Ali', { ai: false });
  frames(e, 90, input({ move: 1, jump: true, dash: true, attack: 'heavy' }));
  assert.equal(e.state.player.x, 360); assert.equal(e.state.player.y, ARENA.floor);
  assert.equal(e.state.player.attack, null); assert.equal(e.state.timer, 90);
});
test('ground movement, dash and walls cannot pass through the opponent', () => {
  const e = active();
  frames(e, 30, input({ move: 1, dash: true }));
  assert.ok(e.state.cpu.x - e.state.player.x >= 76 - 1e-7);
  e.state.cpu.x = ARENA.right; e.state.player.x = ARENA.right - 76;
  frames(e, 240, input({ move: 1 }));
  assert.equal(e.state.cpu.x, ARENA.right);
  assert.ok(e.state.cpu.x - e.state.player.x >= 76 - 1e-7);
});
test('jump is ballistic, cannot double-jump, and lands without sinking', () => {
  const e = active(); e.state.cpu.x = 1000;
  e.update(FIXED_STEP, input({ jump: true }));
  assert.ok(e.state.player.vy < 0); assert.ok(e.state.player.y < ARENA.floor);
  frames(e, 10); const before = e.state.player.vy;
  e.update(FIXED_STEP, input({ jump: true })); assert.ok(e.state.player.vy > before);
  frames(e, 90); assert.equal(e.state.player.y, ARENA.floor); assert.equal(e.state.player.vy, 0);
});
test('jumping over a fighter changes facing after landing', () => {
  const e = active(); e.state.cpu.x = 650;
  e.update(FIXED_STEP, input({ jump: true }));
  frames(e, 65, input({ move: 1 }));
  assert.ok(e.state.player.x > e.state.cpu.x);
  assert.equal(e.state.player.face, -1); assert.equal(e.state.cpu.face, 1);
});
test('a jump at its apex evades a grounded heavy at the height of the drawn fist', () => {
  const e = active(); e.update(FIXED_STEP, input({ jump: true })); frames(e, 9);
  e.update(FIXED_STEP, input(), input({ attack: 'heavy' })); frames(e, 20);
  assert.equal(e.state.player.hp, 100);
});
test('a strike deals damage once during its active frames and not during startup', () => {
  const e = active(); e.update(FIXED_STEP, input({ attack: 'heavy' }));
  frames(e, 6); assert.equal(e.state.cpu.hp, 100);
  frames(e, 25); assert.equal(e.state.cpu.hp, 84);
  frames(e, 30); assert.equal(e.state.cpu.hp, 84);
});
test('hitboxes miss behind the attacker, outside range and above the strike', () => {
  for (const position of [{ x: 1000, y: 570 }, { x: 610, y: 300 }]) {
    const e = active(); Object.assign(e.state.cpu, position);
    e.update(FIXED_STEP, input({ attack: 'light' })); frames(e, 12);
    assert.equal(e.state.cpu.hp, 100);
  }
  const e = active(); e.update(FIXED_STEP, input({ attack: 'heavy' }));
  e.state.cpu.x = 350; frames(e, 20); assert.equal(e.state.cpu.hp, 100);
});
test('guard reduces damage and grants defender meter for player and CPU', () => {
  const e = active();
  e.update(FIXED_STEP, input({ attack: 'heavy' }), input({ guard: true }));
  frames(e, 30, input(), input({ guard: true }));
  assert.equal(e.state.cpu.hp, 97); assert.equal(e.state.cpu.meter, 9);
  const reverse = active();
  reverse.update(FIXED_STEP, input({ guard: true }), input({ attack: 'heavy' }));
  frames(reverse, 30, input({ guard: true })); assert.equal(reverse.state.player.hp, 97);
});
test('three light presses chain once each, then return to the first combo step', () => {
  const e = active(); e.update(FIXED_STEP, input({ attack: 'light' }));
  frames(e, 6); e.update(FIXED_STEP, input({ attack: 'light' }));
  frames(e, 18); assert.equal(e.state.player.attack?.combo, 2);
  e.update(FIXED_STEP, input({ attack: 'light' }));
  frames(e, 50); assert.equal(e.state.cpu.hp, 72); assert.equal(Boolean(e.state.player.attack), false);
  e.update(FIXED_STEP, input({ attack: 'light' })); assert.equal(e.state.player.attack?.combo, 1);
});
test('hitstun cancels the victim attack and queued combo', () => {
  const e = active(); e.update(FIXED_STEP, input({ attack: 'light' }), input({ attack: 'heavy' }));
  frames(e, 7); assert.ok(e.state.cpu.stun > 0); assert.equal(e.state.cpu.attack, null);
  assert.equal(e.state.player.hp, 100);
});
test('equal-startup strikes trade fairly instead of favoring update order', () => {
  const e = active();
  e.update(FIXED_STEP, input({ attack: 'light' }), input({ attack: 'light' }));
  frames(e, 8); assert.equal(e.state.player.hp, 93); assert.equal(e.state.cpu.hp, 93);
});
test('skill and ultimate require meter, charge exactly once, and cap meter at 100', () => {
  for (const [move, cost, damage] of [['skill', 20, 14], ['ultimate', 65, 35]] as const) {
    const e = active();
    e.update(FIXED_STEP, input({ attack: move })); assert.equal(e.state.player.attack, null);
    e.state.player.meter = cost; e.state.cpu.meter = 99;
    e.update(FIXED_STEP, input({ attack: move })); assert.equal(e.state.player.meter, 0);
    frames(e, 80); assert.equal(e.state.cpu.hp, 100 - damage); assert.equal(e.state.cpu.meter, 100);
    assert.equal(e.state.player.meter, move === 'ultimate' ? 0 : 12);
  }
});
test('CPU defensive intent persists until the reaction window expires', () => {
  const e = active(), brain = createBrain(); brain.thinkIn = 0;
  e.state.player.attack = { move: 'heavy', elapsed: .05, combo: 0, connected: false, queued: false };
  const first = decideAI(e.state.cpu, e.state.player, brain, FIXED_STEP, () => 0);
  assert.equal(first.guard, true);
  const second = decideAI(e.state.cpu, e.state.player, brain, FIXED_STEP, () => 1);
  assert.equal(second.guard, true); assert.equal(second.attack, null);
});
test('KO awards one point, resets the round, and ends at two wins', () => {
  const e = active();
  for (let round = 0; round < 2; round++) {
    e.state.player.x = 500; e.state.cpu.x = 610; e.state.cpu.hp = 1;
    e.update(FIXED_STEP, input({ attack: 'heavy' })); frames(e, 40);
    assert.equal(e.state.phase, 'between'); assert.equal(e.state.score[0], round + 1);
    const hp = e.state.cpu.hp; frames(e, 10, input({ attack: 'heavy' })); assert.equal(e.state.cpu.hp, hp);
    frames(e, 100);
    if (round === 0) { assert.equal(e.state.round, 2); assert.equal(e.state.player.meter, 0); frames(e, 100); }
  }
  assert.equal(e.state.phase, 'done'); assert.equal(e.state.result, 0); assert.deepEqual(e.state.score, [2, 0]);
  const rematch = new CombatEngine('Ali'); assert.deepEqual(rematch.state.score, [0, 0]); assert.equal(rematch.state.player.hp, 100);
});
test('timeout uses remaining health; a draw awards neither fighter a point', () => {
  const e = active(); e.state.timer = FIXED_STEP; e.state.player.hp = 80; e.state.cpu.hp = 60;
  frames(e, 1); assert.deepEqual(e.state.score, [1, 0]); assert.match(e.state.notice, /TIME!/);
  const draw = active(); draw.state.timer = FIXED_STEP; frames(draw, 1);
  assert.deepEqual(draw.state.score, [0, 0]); frames(draw, 130);
  assert.equal(draw.state.round, 2); assert.equal(draw.state.phase, 'ready');
});
test('seeded CPU completes an untouched match through two KOs without invalid state', () => {
  let seed = 42;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const e = new CombatEngine('Elton', { random });
  let ticks = 0;
  while (e.state.phase !== 'done' && ticks++ < 60 * 200) {
    e.update(FIXED_STEP);
    for (const f of [e.state.player, e.state.cpu]) {
      assert.ok(Number.isFinite(f.x + f.y + f.hp + f.meter)); assert.ok(f.hp >= 0 && f.hp <= 100);
      assert.ok(f.meter >= 0 && f.meter <= 100); assert.ok(f.x >= ARENA.left && f.x <= ARENA.right);
    }
  }
  assert.equal(e.state.phase, 'done'); assert.equal(e.state.result, 1); assert.deepEqual(e.state.score, [0, 2]);
});
test('invalid frame durations are rejected instead of tunneling through collisions', () => {
  const e = active(); for (const dt of [0, -1, NaN, Infinity, .2]) assert.throws(() => e.update(dt), /fixed steps/);
});

test('rapid second light tap during startup is buffered without changing combat timing', () => {
  const e = active();
  e.update(FIXED_STEP, input({ attack: 'light' }));
  // A quick thumb tap used to be discarded during the first 0.05s.
  e.update(FIXED_STEP, input({ attack: 'light' }));
  assert.equal(e.state.player.attack?.combo, 1);
  assert.equal(e.state.player.attack?.queued, true);
  frames(e, 19);
  assert.equal(e.state.player.attack?.combo, 2);
  assert.equal(e.state.player.attack?.queued, false);
});

test('practice mode is endless, passive and records authentic hit damage', () => {
  const e = new CombatEngine('Ali', { practice: true });
  assert.equal(e.state.mode, 'practice');
  assert.deepEqual(e.state.practiceStats, { hits: 0, damage: 0 });
  assert.equal(e.state.cpu.x, 590);
  e.state.phase = 'active'; e.state.cpu.x = e.state.player.x + 100;
  e.update(FIXED_STEP, input({ attack: 'light' }));
  frames(e, 20);
  assert.equal(e.state.cpu.hp, 93);
  assert.deepEqual(e.state.practiceStats, { hits: 1, damage: 7 });
  assert.equal(e.state.player.hp, 100);
  e.state.cpu.hp = 0; frames(e, 1);
  assert.equal(e.state.cpu.hp, 100);
  assert.equal(e.state.phase, 'active');
  // A training session cannot time out, award rounds or redirect to game over.
  e.state.timer = FIXED_STEP;
  frames(e, 120);
  assert.equal(e.state.phase, 'active');
  assert.equal(e.state.timer, 90);
  assert.deepEqual(e.state.score, [0, 0]);
  assert.equal(e.state.result, null);
});

test('practice reset clears dummy positions and statistics without changing VS rules', () => {
  const e = new CombatEngine('Elton', { practice: true });
  e.state.phase = 'active'; e.state.player.x = 900; e.state.cpu.x = 1000;
  e.state.player.hp = 12; e.state.cpu.hp = 14; e.state.player.meter = 65;
  e.state.practiceStats = { hits: 15, damage: 80 };
  e.resetPractice();
  assert.equal(e.state.player.id, 'Elton');
  assert.equal(e.state.cpu.id, 'Ali');
  assert.equal(e.state.player.x, 490);
  assert.equal(e.state.cpu.x, 590);
  assert.equal(e.state.player.hp, 100);
  assert.equal(e.state.cpu.hp, 100);
  assert.equal(e.state.player.meter, 0);
  assert.deepEqual(e.state.practiceStats, { hits: 0, damage: 0 });
  assert.equal(e.state.phase, 'active');
  const versus = active();
  const before = structuredClone(versus.state);
  versus.resetPractice();
  assert.deepEqual(versus.state, before);
  versus.state.timer = FIXED_STEP;
  frames(versus, 1);
  assert.equal(versus.state.phase, 'between');
});

test('blocking training dummy applies real guard chip damage and can return to free mode', () => {
  const e = new CombatEngine('Ali', { practice: true });
  e.state.phase = 'active';
  e.setPracticeDummyGuard(true);
  assert.equal(e.state.practiceOptions?.dummyGuard, true);
  e.update(FIXED_STEP, input({ attack: 'heavy' }));
  frames(e, 24);
  assert.equal(e.state.cpu.hp, 97); // normal 16 damage heavy -> 3 blocked
  assert.equal(e.state.practiceStats?.hits, 1);
  assert.equal(e.state.practiceStats?.damage, 3);
  e.setPracticeDummyGuard(false);
  assert.equal(e.state.practiceOptions?.dummyGuard, false);
  frames(e, 32); // finish heavy recovery
  e.resetPractice();
  e.update(FIXED_STEP, input({ attack: 'heavy' }));
  frames(e, 24);
  assert.equal(e.state.cpu.hp, 84); // unblocked 16 damage
  assert.equal(e.state.practiceStats?.damage, 16);
});

test('infinite-meter practice can repeat skills without changing their real cost or VS', () => {
  const e = new CombatEngine('Ali', { practice: true });
  e.state.phase = 'active';
  e.setPracticeInfiniteMeter(true);
  assert.equal(e.state.practiceOptions?.infiniteMeter, true);
  assert.equal(e.state.player.meter, 100);
  e.update(FIXED_STEP, input({ attack: 'ultimate' }));
  assert.equal(e.state.player.attack?.move, 'ultimate');
  assert.equal(e.state.player.meter, 100); // replenished after charged ultimate
  frames(e, 90);
  e.update(FIXED_STEP, input({ attack: 'ultimate' }));
  assert.equal(e.state.player.attack?.move, 'ultimate');
  e.resetPractice();
  assert.equal(e.state.practiceOptions?.infiniteMeter, true);
  assert.equal(e.state.player.meter, 100);
  e.setPracticeInfiniteMeter(false);
  e.state.player.meter = 65;
  e.update(FIXED_STEP, input({ attack: 'ultimate' }));
  assert.equal(e.state.player.meter, 0); // ordinary cost restored
  const versus = new CombatEngine('Ali', { ai: false });
  const original = structuredClone(versus.state);
  versus.setPracticeInfiniteMeter(true);
  versus.setPracticeDummyGuard(true);
  assert.deepEqual(versus.state, original); // guarded setters cannot touch VS
  versus.state.phase = 'active';
  versus.update(FIXED_STEP, input({ attack: 'ultimate' }));
  assert.equal(versus.state.player.attack, null);
});
