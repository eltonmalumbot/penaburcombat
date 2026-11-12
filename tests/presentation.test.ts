import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAtlas, sampleFrame } from '../src/animation/atlas.ts';
import { spritePresentation } from '../src/animation/presentation.ts';
import { createFighter } from '../src/game/characters.ts';
import { moveData } from '../src/game/moves.ts';
import type { Pose } from '../src/game/types.ts';

for (const id of ['Ali', 'Elton'] as const) test(`${id}: authored clips win, temporary poses preserve geometry and fighter state`, () => {
  const metadata = parseAtlas(JSON.parse(readFileSync(`public/assets/fighters/${id.toLowerCase()}.json`, 'utf8')));
  const f = createFighter(id, 400, 1);
  for (const pose of ['idle', 'walk', 'jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory'] as Pose[]) {
    f.pose = pose; f.animationTime = .2;
    const before = structuredClone(f), p = spritePresentation(metadata, f);
    assert.deepEqual(f, before);
    assert.equal(p.temporary, !['idle', 'walk'].includes(pose));
    assert.equal(p.frame, sampleFrame(metadata, p.temporary ? 'idle' : pose, p.temporary ? 0 : .2));
    if (pose !== 'ko') assert.equal(p.y, 0);
    else assert.ok(Math.abs(p.y + (p.frame.w - p.frame.pivotX) * metadata.scale) < 1e-8);
  }
  metadata.clips.hurt = metadata.clips.walk;
  f.pose = 'hurt';
  assert.equal(spritePresentation(metadata, f).temporary, false);
});

test('sideways KO ignores transparent padding for either native orientation', () => {
  const metadata = parseAtlas(JSON.parse(readFileSync('public/assets/fighters/ali.json', 'utf8')));
  const f = createFighter('Ali', 400, 1); f.pose = 'ko';
  const bounds = { left: 60, right: 320 };
  assert.equal(spritePresentation(metadata, f, bounds).y, -(320 - 200) * metadata.scale);
  metadata.facing = 'left';
  assert.equal(spritePresentation(metadata, f, bounds).y, -(200 - 60) * metadata.scale);
});

test('missing Ali and Elton attack clips show three real-time presentation beats without altering combat', () => {
  for (const id of ['Ali', 'Elton'] as const) {
    const metadata = parseAtlas(JSON.parse(readFileSync(`public/assets/fighters/${id.toLowerCase()}.json`, 'utf8')));
    for (const move of ['light', 'heavy', 'skill', 'ultimate'] as const) {
      const f = createFighter(id, 500, 1);
      f.pose = move === 'light' ? 'light3' : move;
      f.attack = { move, combo: move === 'light' ? 3 : 0,
        elapsed: 0, connected: false, queued: false };
      const snapshot = structuredClone(f);
      const start = spritePresentation(metadata, f);
      assert.equal(start.temporary, true);
      assert.equal(start.x, 0); assert.equal(start.rotation, 0);
      const data = moveData(f.attack);
      f.attack.elapsed = data.startup * .70;
      const windup = spritePresentation(metadata, f);
      assert.ok(windup.x < -1 && windup.rotation > 0, id + ' windup');
      f.attack.elapsed = data.startup + data.active * .5;
      const impact = spritePresentation(metadata, f);
      assert.ok(impact.x > 10 && impact.rotation < -.04, id + ' contact');
      f.attack.elapsed = data.startup + data.active + data.recovery * .5;
      const recover = spritePresentation(metadata, f);
      assert.ok(recover.x > 0 && recover.x < impact.x, id + ' recovery');
      f.attack.elapsed = data.startup + data.active + data.recovery;
      const end = spritePresentation(metadata, f);
      assert.equal(end.x, 0); assert.equal(end.rotation, 0);
      for (const stage of [start, windup, impact, recover, end]) {
        assert.equal(stage.y, 0, 'ground pivots stay untouched');
        assert.deepEqual(stage.frame, start.frame, 'fallback reuses exactly approved idle artwork');
      }
      assert.deepEqual(snapshot.attack && { move: snapshot.attack.move, combo: snapshot.attack.combo },
        { move, combo: move === 'light' ? 3 : 0 });
      assert.equal(f.x, 500, 'presentation never mutates fighter position');
    }
  }
});

test('independently authored attack clips override all fallback lunge effects', () => {
  const metadata = parseAtlas(JSON.parse(readFileSync('public/assets/fighters/elton.json', 'utf8')));
  metadata.clips.heavy = metadata.clips.walk; // synthetic authored heavy in test only
  const f = createFighter('Elton', 420, -1);
  f.pose = 'heavy'; f.attack = { move: 'heavy', combo: 0, elapsed: .25, connected: true, queued: false };
  f.animationTime = 100;
  const authored = spritePresentation(metadata, f);
  assert.equal(authored.temporary, false);
  assert.equal(authored.x, 0); assert.equal(authored.rotation, 0);
  assert.equal(authored.y, 0);
});

test('attack-pose gating isolates combat timing and fallback motion for Ali and Elton', () => {
  for (const id of ['Ali', 'Elton'] as const) {
    const metadata = parseAtlas(JSON.parse(readFileSync(`public/assets/fighters/${id.toLowerCase()}.json`, 'utf8')));
    const frames = [
      { frame: 'idle-0', duration: .1 },
      { frame: 'walk-0', duration: .2 },
    ];
    metadata.clips.light1 = { loop: false, frames };
    metadata.clips.light2 = { loop: false, frames };
    const fighter = createFighter(id, 400, 1);
    fighter.attack = { move: 'light', combo: 2, elapsed: .2,
      connected: false, queued: false };
    fighter.pose = 'light1'; // Another combo pose must use its own presentation time.
    fighter.animationTime = .02;
    const before = structuredClone(fighter);
    const mismatch = spritePresentation(metadata, fighter);
    assert.equal(mismatch.temporary, false);
    assert.equal(mismatch.frame, metadata.frames['idle-0'], id + ' mismatch uses animation clock');
    assert.equal(mismatch.x, 0);
    assert.equal(mismatch.rotation, 0);

    fighter.pose = 'light2'; // Correct pose follows the authoritative attack clock.
    const matched = spritePresentation(metadata, fighter);
    assert.equal(matched.frame, metadata.frames['walk-0'], id + ' matching combo uses attack clock');
    assert.equal(matched.x, 0);
    assert.equal(matched.rotation, 0);

    delete metadata.clips.light1;
    fighter.pose = 'light1';
    const staleFallback = spritePresentation(metadata, fighter);
    assert.equal(staleFallback.temporary, true);
    assert.equal(staleFallback.x, 0, id + ' mismatched combo cannot lunge');
    assert.equal(staleFallback.rotation, 0);

    delete metadata.clips.light2;
    fighter.pose = 'light2';
    fighter.attack.elapsed = .12;
    const activeFallback = spritePresentation(metadata, fighter);
    assert.equal(activeFallback.temporary, true);
    assert.ok(activeFallback.x > 10, id + ' matching missing clip still lunges');

    fighter.pose = 'skill'; // An interrupted unrelated attack cannot animate a skill.
    const otherFallback = spritePresentation(metadata, fighter);
    assert.equal(otherFallback.x, 0);
    assert.equal(otherFallback.rotation, 0);
    assert.deepEqual(before.attack, fighter.attack && { ...fighter.attack, elapsed: .2 },
      id + ' presentation does not mutate the stored attack');
  }
});
