import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  let commit = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  if (!/^[a-f0-9]{40}$/i.test(commit)) {
    try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
    catch { commit = 'unknown'; }
  }
  return {
    plugins: [{
      name: 'build-identity',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'build-info.json',
          source: JSON.stringify({ name: 'penaburcombat', commit }) + '\n' });
      },
    }],
  };
});
