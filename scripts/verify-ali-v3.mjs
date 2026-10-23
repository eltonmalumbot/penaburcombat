#!/usr/bin/env node
/**
 * Strict intake checks for a LOCAL Ali Light Combo V3 ZIP extraction.
 * NO artwork approval, repo mutation, merge or deployment is performed here.
 *
 * Examples:
 *   node scripts/verify-ali-v3.mjs --manifest-only
 *   node scripts/verify-ali-v3.mjs --art-dir /tmp/Ali_Cleanup_V3 --repo .
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ATLAS_SHA = '6b73f725013558b0b08f7cd1c91efdbd7bb1d8df2c3ddf588251ac9bf37f878a';
const APPROVED_ALI_SHA = '3d33a2327da2de6be3d1e4d3270f2c922df44aad11892c61135dac84b3408905';
const combos = Object.freeze({
  light1: { timings: [.04, .04, .035, .055, .09, .09], phases: [.08, .09, .18], total: .35 },
  light2: { timings: [.04, .04, .035, .055, .09, .09], phases: [.08, .09, .18], total: .35 },
  light3: { timings: [.05, .04, .03, .045, .045, .18], phases: [.12, .09, .18], total: .39 },
});
const die = message => { throw new Error('ART INTAKE BLOCKED: ' + message); };
const eq = (x, y) => Math.abs(x - y) < 1e-9;
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const read = path => {
  if (!existsSync(path)) die('missing file: ' + path);
  return readFileSync(path);
};
function pngSize(bytes, name) {
  if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || bytes.toString('ascii', 12, 16) !== 'IHDR') die(name + ' is not PNG');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0)
    die(name + ' must be 8-bit noninterlaced RGBA');
  return [width, height];
}
const same = (values, expected) => Array.isArray(values) && values.length === expected.length
  && values.every((v, i) => typeof v === 'number' && eq(v, expected[i]));
const requiredSha = hash => typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Inspect the tracked, code-reviewable intake contract (not actual art). */
function spec(root) {
  const path = join(root, 'docs/assets/ALI_V3_INTAKE.json');
  const config = JSON.parse(read(path).toString('utf8'));
  if (!object(config)) die('invalid tracked intake JSON');
  if (config.status !== 'REVIEW_ONLY' || config.isApprovedProductionArt !== false)
    die('tracked intake must explicitly remain unapproved');
  if (config.atlasSha256 !== ATLAS_SHA || config.approvedOriginalAliSha256 !== APPROVED_ALI_SHA)
    die('pinned candidate / approved-origin checksums changed');
  if (!same(config.atlasSize, [4320, 1620]) || !same(config.frameSize, [720, 540])
      || config.frameCount !== 18) die('tracked dimensions or frame count changed');
  for (const [id, expectation] of Object.entries(combos))
    if (!same(config.clips?.[id], expectation.timings)) die('tracked clip timing mismatch: ' + id);
  return config;
}

/** Reject mutated or unapproved provenance before inspecting potentially large images. */
function validateCandidateHeader(manifest) {
  if (!object(manifest)) die('invalid candidate manifest JSON');
  if (manifest.fighter !== 'Ali' || manifest.version !== 3 || manifest.isApprovedProductionArt !== false)
    die('V3 manifest must be an unapproved Ali candidate');
  if (!String(manifest.status).includes('NOT_PRODUCTION_ART') ||
      !String(manifest.reviewStatus).includes('manual review'))
    die('candidate review blockers were removed or relabeled');
  if (manifest.originalRepoAssetSha256 !== APPROVED_ALI_SHA ||
      manifest.combatOnlySha256 !== ATLAS_SHA) die('asset provenance / atlas checksum differs');
  if (!same(manifest.frameSize, [720, 540]) ||
      !same(manifest.combatOnlySize, [4320, 1620]) ||
      !same(manifest.combinedAtlasSize, [4320, 2700]) ||
      manifest.pivots?.pivotX !== 320 || manifest.pivots?.pivotY !== 525 ||
      !eq(manifest.scale, .6420824295) || manifest.facing !== 'right')
    die('unexpected candidate geometry, original scale or pivots');
}

function validateCandidateAtlas(folder, manifest) {
  const atlas = read(join(folder, 'ali-combat-frames.png'));
  if (sha(atlas) !== ATLAS_SHA || !same(pngSize(atlas, 'atlas'), [4320, 1620]))
    die('atlas bytes, dimensions or transparency format changed');
  if (!Array.isArray(manifest.frameQA) || manifest.frameQA.length !== 18 ||
      !object(manifest.combatFrameRects) ||
      Object.keys(manifest.combatFrameRects).length !== 18)
    die('must contain exactly 18 validated and indexed frames');
}

/** Independently validate one attack to keep the contact/recovery contract readable. */
function validateCombatClip(manifest, folder, row, name, expected, seen) {
  const clip = manifest.clips?.[name];
  const entries = clip?.frames;
  if (clip?.loop !== false || !Array.isArray(entries) || entries.length !== 6 ||
      !entries.every(entry => object(entry) && typeof entry.frame === 'string' &&
         typeof entry.duration === 'number' && Number.isFinite(entry.duration)) ||
      !same(entries.map(e => e.duration), expected.timings) ||
      !same(manifest.clipTiming?.[name], expected.timings))
    die('incorrect nonlooping 6-frame timing: ' + name);
  const phase = row === 2
    ? [entries.slice(0, 3), entries.slice(3, 5), entries.slice(5)]
    : [entries.slice(0, 2), entries.slice(2, 4), entries.slice(4)];
  if (!same(phase.map(part => part.reduce((a, f) => a + f.duration, 0)), expected.phases) ||
      !eq(entries.reduce((a, f) => a + f.duration, 0), expected.total))
    die('startup/active/recovery drift: ' + name);

  for (let col = 0; col < 6; col++) {
    const id = name + '-' + col, file = name + '-' + String(col).padStart(2, '0') + '.png';
    const rect = manifest.combatFrameRects[id];
    if (entries[col].frame !== id || rect?.x !== col * 720 ||
        rect?.y !== 1080 + row * 540 || rect?.w !== 720 || rect?.h !== 540 ||
        rect?.pivotX !== 320 || rect?.pivotY !== 525)
      die('bad atlas coordinates or pivots: ' + id);
    const check = manifest.frameQA.find(item => object(item) && item.frame === file);
    if (!check || seen.has(file) || !requiredSha(check.sha256))
      die('missing/duplicated QA entry: ' + file);
    seen.add(file);
    const bytes = read(join(folder, 'frames', file));
    if (!same(pngSize(bytes, file), [720, 540]) || sha(bytes) !== check.sha256)
      die('invalid frame PNG bytes: ' + file);
  }
}

function validateApprovedOriginal(repo) {
  const original = read(join(repo, 'public/assets/fighters/ali.png'));
  if (sha(original) !== APPROVED_ALI_SHA) die('original GitHub Ali PNG is not the approved source');
  const metadata = JSON.parse(read(join(repo, 'public/assets/fighters/ali.json')).toString('utf8'));
  if (!object(metadata) || metadata.image !== 'ali.png' || !object(metadata.clips) ||
      Object.keys(metadata.clips).sort((a, b) => a.localeCompare(b)).join(',') !== 'idle,walk')
    die('production Ali metadata was already changed to candidate art');
}

/** Inspect delivered bytes, NOT generated stand-ins or a pasted status label. */
function validateArt(root, folder, repo) {
  const manifest = JSON.parse(read(join(folder, 'manifest.json')).toString('utf8'));
  validateCandidateHeader(manifest);
  validateCandidateAtlas(folder, manifest);
  const seen = new Set();
  for (const [row, [name, expected]] of Object.entries(combos).entries())
    validateCombatClip(manifest, folder, row, name, expected, seen);
  if (seen.size !== 18) die('unexpected frame set');
  if (repo) validateApprovedOriginal(repo);
  return { candidate: 'Ali Light Combo V3', sha256: ATLAS_SHA, validatedFrames: seen.size,
    clipSeconds: [combos.light1.total, combos.light2.total, combos.light3.total],
    artApproved: false, outstanding: [
      'Light3 F4/F5: cropped body and effects; needs reauthored artwork',
      'Compare silhouette, identity, ground pivot and both facings on actual devices',
    ] };
}

try {
  const args = process.argv.slice(2);
  const base = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const only = args.includes('--manifest-only');
  const get = flag => { const i = args.indexOf(flag); return i < 0 ? null : (args[i + 1] ?? null); };
  spec(base);
  if (only) {
    if (args.length !== 1) die('manifest-only does not accept additional arguments');
    console.log('PASS: pinned V3 provenance and timing contract; NO artwork bytes checked or approved.');
  } else {
    const folder = get('--art-dir');
    if (!folder) die('Use --art-dir <extracted-V3-folder> or --manifest-only');
    const result = validateArt(base, resolve(folder), get('--repo') ? resolve(get('--repo')) : null);
    console.log(JSON.stringify({ status: 'AUTOMATED_INTEGRITY_PASS__VISUAL_REVIEW_REQUIRED', ...result }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
