import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = new URL('../', import.meta.url).pathname;
const cli = new URL('../scripts/verify-ali-v3.mjs', import.meta.url).pathname;
const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: repo, encoding: 'utf8' });

test('tracked Ali V3 intake must remain explicitly review-only and pinned', () => {
  const result = run('--manifest-only');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /NO artwork bytes checked or approved/);
});

test('Ali V3 intake never silently succeeds without delivered artwork', () => {
  const noArgs = run();
  assert.notEqual(noArgs.status, 0);
  assert.match(noArgs.stderr, /Use --art-dir/);
});

test('Ali V3 intake rejects missing assets and forged manifests before calling them valid', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ali-intake-'));
  try {
    const missing = run('--art-dir', folder);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /missing file:.*manifest.json/);
    writeFileSync(join(folder, 'manifest.json'), JSON.stringify({
      version: 3, fighter: 'Ali', isApprovedProductionArt: true,
    }));
    const altered = run('--art-dir', folder);
    assert.notEqual(altered.status, 0);
    assert.match(altered.stderr, /unapproved Ali candidate/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
