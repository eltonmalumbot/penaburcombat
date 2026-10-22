import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseAtlas, sampleFrame, validateAtlasImage } from '../src/animation/atlas.ts';
import { character } from '../src/game/characters.ts';

for (const [name, scale] of [['Ali', .6420824295], ['Elton', .6607142857]] as const) {
  test(`${name} approved atlas has original checksum, RGBA dimensions and valid curated clips`, () => {
    const file = name.toLowerCase();
    const base = new URL(`../public/assets/fighters/${file}`, import.meta.url);
    const png = readFileSync(`${base.pathname}.png`);
    const expected = readFileSync(`${base.pathname}.png.sha256`, 'utf8').trim().split(/\s+/)[0];
    assert.equal(createHash('sha256').update(png).digest('hex'), expected);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1600); assert.equal(png.readUInt32BE(20), 1080);
    assert.equal(png[24], 8); assert.equal(png[25], 6); // 8-bit RGBA, not an opaque sheet.
    const metadata = parseAtlas(JSON.parse(readFileSync(`${base.pathname}.json`, 'utf8')));
    validateAtlasImage(metadata, 1600, 1080);
    assert.equal(metadata.scale, scale); assert.equal(metadata.sampling, 'smooth'); assert.equal(metadata.facing, 'right');
    assert.equal(Object.keys(metadata.frames).length, 8);
    assert.deepEqual(metadata.clips.idle.frames.map(f => f.frame), ['idle-0']);
    assert.deepEqual(metadata.clips.walk.frames.map(f => f.frame), ['walk-0', 'walk-1', 'walk-2', 'walk-1']);
    for (const frame of Object.values(metadata.frames)) {
      assert.equal(frame.w, 400); assert.equal(frame.h, 540);
      assert.equal(frame.pivotX, 200); assert.ok(frame.pivotY === 525 || frame.pivotY === 526);
    }
    assert.equal(sampleFrame(metadata, 'walk', .01), sampleFrame(metadata, 'walk', .61));
    for (const pose of ['jump', 'fall', 'guard', 'light1', 'light2', 'light3', 'heavy', 'skill', 'ultimate', 'hurt', 'ko', 'victory'] as const) assert.equal(sampleFrame(metadata, pose, .2), null);
    assert.equal(character(name).atlasUrl, `/assets/fighters/${file}.json`);
    assert.equal(character(name).speed, 310);
  });
}
