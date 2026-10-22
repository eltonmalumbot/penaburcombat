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

for (const move of ['light', 'heavy', 'skill', 'ultimate'] as const) {
  test(`${move}: authored strikes follow combat time and restart even when the pose is unchanged`, () => {
    const metadata = parseAtlas(JSON.parse(readFileSync('public/assets/fighters/ali.json', 'utf8')));
    const f = createFighter('Ali', 400, 1);
    const pose = move === 'light' ? 'light2' : move;
    metadata.clips[pose] = { loop: false, frames: [
      { frame: 'idle-0', duration: .1 }, { frame: 'walk-0', duration: .2 },
    ] };
    f.pose = pose; f.animationTime = 10;
    f.attack = { move, combo: 2, elapsed: .12, connected: false, queued: false };
    const before = structuredClone(f);
    assert.equal(spritePresentation(metadata, f).frame, metadata.frames['walk-0']);
    assert.deepEqual(f, before);
    // A new strike can retain the same pose and stale pose time.
    f.attack.elapsed = 0;
    assert.equal(spritePresentation(metadata, f).frame, metadata.frames['idle-0']);
    f.attack.elapsed = 20;
    assert.equal(spritePresentation(metadata, f).frame, metadata.frames['walk-0']);
    f.pose = 'walk'; f.animationTime = .16;
    assert.equal(spritePresentation(metadata, f).frame, sampleFrame(metadata, 'walk', .16));
    f.pose = pose; f.attack = null; f.animationTime = .12;
    assert.equal(spritePresentation(metadata, f).frame, metadata.frames['walk-0']);
  });
}
