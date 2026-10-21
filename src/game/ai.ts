import type { Brain, CombatInput, Fighter } from './types.ts';
import { emptyInput } from './types.ts';
import { grounded } from './geometry.ts';
import { moveData } from './moves.ts';

export function createBrain(): Brain { return { thinkIn: .22, guardFor: 0, jumpCooldown: 2 }; }

/** Deliberate at human-scale intervals; defensive intent persists between decisions. */
export function decideAI(self: Fighter, enemy: Fighter, brain: Brain, dt: number, random: () => number): CombatInput {
  brain.thinkIn -= dt;
  brain.guardFor = Math.max(0, brain.guardFor - dt);
  brain.jumpCooldown = Math.max(0, brain.jumpCooldown - dt);
  const input = emptyInput(), distance = Math.abs(enemy.x - self.x);
  input.move = distance > 118 ? (enemy.x > self.x ? 1 : -1) : 0;
  if (brain.guardFor > 0 && grounded(self)) { input.guard = true; input.move = 0; return input; }
  if (brain.thinkIn > 0 || self.stun > 0 || self.attack || self.hp <= 0) return input;
  brain.thinkIn = .17 + random() * .17;
  if (enemy.attack && distance < moveData(enemy.attack).reach + 55 && grounded(self) && random() < .62) {
    brain.guardFor = .26 + random() * .12;
    input.guard = true; input.move = 0;
    return input;
  }
  const roll = random();
  if (self.meter >= 65 && distance < 350 && roll > .50) input.attack = 'ultimate';
  else if (self.meter >= 20 && distance < 270 && (distance > 155 || roll > .70)) input.attack = 'skill';
  else if (distance < 140) input.attack = roll < .72 ? 'light' : 'heavy';
  else if (distance > 420 && grounded(self)) input.dash = roll > .75;
  if (!input.attack && !input.dash && distance > 240 && brain.jumpCooldown === 0 && roll < .10) {
    input.jump = true; brain.jumpCooldown = 3;
  }
  return input;
}
