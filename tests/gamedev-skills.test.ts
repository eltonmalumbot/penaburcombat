import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const skills = [
  'penabur-art-qa',
  'penabur-game-feel',
  'penabur-input-qa',
  'penabur-performance',
] as const;

for (const name of skills) {
  test(`game-dev agent skill ${name} is discoverable and has a task description`, () => {
    const body = readFileSync(new URL(`../.agents/skills/${name}/SKILL.md`, import.meta.url), 'utf8');
    assert.match(body, new RegExp(`^---\\nname: ${name}\\ndescription: >\\n`));
    assert.match(body, /\n---\n\n# /);
    assert.match(body, /No .*production|No gameplay|without.*production|not.*production/i);
    assert.ok(body.length > 900, 'guidance must be substantive, not an empty trigger');
  });
}

test('Codex integration document and AGENTS use all project-local skills', () => {
  const agents = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
  const guide = readFileSync(new URL('../docs/GAMEDEV_AGENT_SKILLS.md', import.meta.url), 'utf8');
  assert.match(agents, /CUSTOM TypeScript \+ HTML Canvas 2D/);
  assert.match(agents, /explicit owner approval BEFORE merging main/);
  assert.match(guide, /c6ca6c41c839b68319ffc08430b99ab768debc32/);
  for (const name of skills) {
    assert.ok(agents.includes(`.agents/skills/${name}/SKILL.md`));
    assert.ok(guide.includes(name));
  }
  assert.match(guide, /not.*copied|NOT copied/i);
});
