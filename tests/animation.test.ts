import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAtlas, sampleFrame, validateAtlasImage } from '../src/animation/atlas.ts';

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
