import test from 'node:test';
import assert from 'node:assert/strict';
import { addImpactCue, advanceImpactCues, MAX_IMPACT_CUES } from '../src/render/impact.ts';

const hit = { type: 'hit' as const, x: 620, y: 390, blocked: false, color: '#62ddff' };
const block = { ...hit, blocked: true };

test('confirmed contacts create distinct, immutable hit and guard cues', () => {
  const initial = addImpactCue([], hit);
  const next = addImpactCue(initial, block);
  assert.deepEqual(initial, [{ x: 620, y: 390, color: '#62ddff', blocked: false, age: 0, duration: .32 }]);
  assert.equal(next.length, 2);
  assert.equal(next[0], initial[0]);
  assert.equal(next[1].blocked, true);
  assert.equal(next[1].duration, .24);
});

test('visual cue lifetime is finite and capped without changing event properties', () => {
  let cues = addImpactCue([], hit);
  const before = cues[0];
  cues = advanceImpactCues(cues, .1);
  assert.equal(cues[0].age, .1);
  assert.equal(before.age, 0);
  cues = advanceImpactCues(cues, .1);
  cues = advanceImpactCues(cues, .1);
  assert.equal(cues.length, 1);
  cues = advanceImpactCues(cues, .1);
  assert.equal(cues.length, 0);
  for (let i = 0; i < 50; i++) cues = addImpactCue(cues, { ...hit, x: i });
  assert.equal(cues.length, MAX_IMPACT_CUES);
  assert.equal(cues[0].x, 50 - MAX_IMPACT_CUES);
  assert.equal(cues[MAX_IMPACT_CUES - 1].x, 49);
});

test('paused and invalid time do not progress impacts; long dt is capped', () => {
  const cues = addImpactCue([], block);
  for (const dt of [0, -1, NaN, Infinity]) {
    const unchanged = advanceImpactCues(cues, dt);
    assert.deepEqual(unchanged, cues);
    assert.notEqual(unchanged, cues);
  }
  const after = advanceImpactCues(cues, 30);
  assert.equal(after[0].age, .1);
  assert.equal(cues[0].age, 0);
});
