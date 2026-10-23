import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAtlas, sampleFrame } from '../src/animation/atlas.ts';
import { spritePresentation } from '../src/animation/presentation.ts';
import { createFighter } from '../src/game/characters.ts';
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

test('authored attack playback uses the combat clock, not drifting sprite animation time', () => {
  const metadata = parseAtlas({
    version: 1, image: 'synthetic.png', frames: {
      stance: { x: 0, y: 0, w: 100, h: 100 },
      startup: { x: 100, y: 0, w: 100, h: 100 },
      impact: { x: 200, y: 0, w: 100, h: 100 },
      recovery: { x: 300, y: 0, w: 100, h: 100 },
    }, clips: {
      idle: { loop: true, frames: [{ frame: 'stance', duration: .2 }] },
      light1: { loop: false, frames: [
        { frame: 'startup', duration: .08 },
        { frame: 'impact', duration: .09 },
        { frame: 'recovery', duration: .18 },
      ] },
      heavy: { loop: false, frames: [
        { frame: 'startup', duration: .2 },
        { frame: 'impact', duration: .12 },
        { frame: 'recovery', duration: .3 },
      ] },
    },
  });
  const fighter = createFighter('Ali', 350, 1);
  fighter.pose = 'light1';
  fighter.animationTime = 999; // deliberately wrong: would stick on recovery
  fighter.attack = { move: 'light', combo: 1, elapsed: .03, connected: false, queued: false };
  const first = structuredClone(fighter);
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.startup);
  fighter.attack.elapsed = .10;
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.impact);
  fighter.attack.elapsed = .23;
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.recovery);
  fighter.pose = 'heavy';
  fighter.attack = { move: 'heavy', combo: 0, elapsed: .205, connected: false, queued: false };
  fighter.animationTime = 0; // opposing error: would show startup without fix
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.impact);
  fighter.attack = null;
  // Without a live attack, fallback to pose animation clock, don't freeze.
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.startup);
  fighter.pose = 'idle';
  fighter.animationTime = 200;
  assert.equal(spritePresentation(metadata, fighter).frame, metadata.frames.stance);
  assert.equal(first.attack?.elapsed, .03);
  assert.equal(first.animationTime, 999);
});
