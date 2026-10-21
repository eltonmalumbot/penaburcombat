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
test('non-looping KO holds its last frame and absent animations fall back to idle', () => {
  const atlas = parseAtlas(fixture());
  assert.equal(sampleFrame(atlas, 'ko', 100), atlas.frames.b);
  assert.equal(sampleFrame(atlas, 'heavy', .05), atlas.frames.a);
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
});
