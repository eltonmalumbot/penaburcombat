import test from 'node:test';
import assert from 'node:assert/strict';
import { ATLAS_POSES, parseAtlas, sampleFrame, validateAtlasImage } from '../src/animation/atlas.ts';

const fixture = () => ({ version: 1, image: './original.png', frames: {
  a: { x: 0, y: 0, w: 100, h: 200 }, b: { x: 100, y: 0, w: 100, h: 200, pivotX: 40, pivotY: 190 },
}, clips: { idle: { frames: [{ frame: 'a', duration: .1 }, { frame: 'b', duration: .2 }], loop: true },
  ko: { frames: [{ frame: 'a', duration: .1 }, { frame: 'b', duration: .2 }], loop: false } } });

test('atlas clips loop, respect frame durations, and anchor feet by default', () => {
  const atlas = parseAtlas(fixture());
  assert.equal(sampleFrame(atlas, 'idle', .05), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'idle', .15), atlas.frames.b);
  assert.equal(sampleFrame(atlas, 'idle', .35), atlas.frames.a);
  assert.equal(atlas.frames.a.pivotX, 50); assert.equal(atlas.frames.a.pivotY, 200);
});
test('non-looping KO holds its last frame and absent animations remain distinguishable from authored clips', () => {
  const atlas = parseAtlas(fixture());
  assert.equal(sampleFrame(atlas, 'ko', 100), atlas.frames.b);
  for (const pose of ['walk', 'jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'victory'] as const) {
    assert.equal(sampleFrame(atlas, pose, .05), null, pose);
  }
  assert.equal(sampleFrame(atlas, 'idle', -10), atlas.frames.a);
});
test('malformed metadata and out-of-bounds images are rejected', () => {
  for (const value of [null, {}, { ...fixture(), version: 2 }, { ...fixture(), scale: NaN },
    { ...fixture(), frames: { a: { x: -1, y: 0, w: 10, h: 10 } } },
    { ...fixture(), clips: { idle: { frames: [{ frame: 'missing', duration: .1 }], loop: true } } },
    { ...fixture(), clips: { idle: { frames: [{ frame: 'a', duration: 0 }], loop: true } } },
    { ...fixture(), clips: { idle: { frames: [], loop: true } } }]) assert.throws(() => parseAtlas(value));
  const atlas = parseAtlas(fixture());
  assert.doesNotThrow(() => validateAtlasImage(atlas, 200, 200));
  assert.throws(() => validateAtlasImage(atlas, 199, 200), /exceeds/);
  assert.throws(() => validateAtlasImage(atlas, 0, 0), /empty/);
  for (const invalid of [NaN, Infinity, -1, 1.5]) assert.throws(() => validateAtlasImage(atlas, invalid, 200));
});
test('HD sampling and source direction have compatible defaults and explicit overrides', () => {
  const atlas = parseAtlas(fixture());
  assert.equal(atlas.sampling, 'smooth'); assert.equal(atlas.facing, 'right');
  const alternate = parseAtlas({ ...fixture(), sampling: 'pixelated', facing: 'left' });
  assert.equal(alternate.sampling, 'pixelated'); assert.equal(alternate.facing, 'left');
  assert.throws(() => parseAtlas({ ...fixture(), sampling: 'unknown' }), /sampling/);
  assert.throws(() => parseAtlas({ ...fixture(), facing: 'up' }), /facing/);
});
test('clip boundaries, non-finite clocks and independent foot pivots sample predictably', () => {
  const atlas = parseAtlas(fixture());
  assert.equal(sampleFrame(atlas, 'idle', .1), atlas.frames.b);
  assert.equal(sampleFrame(atlas, 'idle', NaN), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'idle', Infinity), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'idle', .15)?.pivotY, 190);
});

test('Phase 3A atlas contract rejects fractional pixel crops and pivots outside the frame', () => {
  const base = fixture();
  for (const invalidFrame of [
    { x: .5, y: 0, w: 100, h: 200 },
    { x: 0, y: 0, w: 100.5, h: 200 },
    { x: 0, y: 0, w: 100, h: 200, pivotX: -1, pivotY: 200 },
    { x: 0, y: 0, w: 100, h: 200, pivotX: 101, pivotY: 200 },
    { x: 0, y: 0, w: 100, h: 200, pivotX: 50, pivotY: 201 },
    { x: 0, y: 0, w: 100, h: 200, pivotX: 50, pivotY: -2 },
  ]) {
    assert.throws(() => parseAtlas({ ...base, frames: { ...base.frames, a: invalidFrame } }));
  }
  // Feet may be planted on the last pixel edge, including the exact bottom border.
  assert.doesNotThrow(() => parseAtlas({ ...base, frames: {
    ...base.frames, a: { x: 0, y: 0, w: 100, h: 200, pivotX: 0, pivotY: 200 },
  } }));
});

test('Phase 3A clip validation catches typos and looping one-shot combat animations', () => {
  const base = fixture();
  assert.equal(new Set(ATLAS_POSES).size, 14);
  assert.deepEqual(ATLAS_POSES, [
    'idle', 'walk', 'jump', 'fall', 'guard', 'light1', 'light2', 'light3',
    'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory',
  ]);
  const once = { frames: [{ frame: 'a', duration: .1 }, { frame: 'b', duration: .15 }], loop: false };
  for (const pose of ['light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko']) {
    assert.throws(() => parseAtlas({ ...base, clips: {
      ...base.clips, [pose]: { ...once, loop: true },
    } }), /Non-looping combat clip/, pose);
    assert.doesNotThrow(() => parseAtlas({ ...base, clips: { ...base.clips, [pose]: once } }), pose);
  }
  assert.throws(() => parseAtlas({ ...base, clips: { ...base.clips,
    light_1: once,
  } }), /Unknown atlas pose/);
});

test('Phase 3A authored one-shot strike samples startup, impact and recovery deterministically', () => {
  const base = fixture();
  const atlas = parseAtlas({ ...base, clips: { ...base.clips,
    heavy: { loop: false, frames: [
      { frame: 'a', duration: .12 },
      { frame: 'b', duration: .18 },
      { frame: 'a', duration: .30 },
    ] },
  } });
  assert.equal(sampleFrame(atlas, 'heavy', 0), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'heavy', .12), atlas.frames.b);
  assert.equal(sampleFrame(atlas, 'heavy', .299), atlas.frames.b);
  assert.equal(sampleFrame(atlas, 'heavy', .31), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'heavy', 50), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'heavy', Number.NaN), atlas.frames.a);
  assert.equal(sampleFrame(atlas, 'ultimate', .2), null);
});
