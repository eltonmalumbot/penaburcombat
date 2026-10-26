import { sampleFrame } from './atlas.ts';
import { moveData } from '../game/moves.ts';
import type { AtlasMetadata } from './atlas.ts';
import type { Fighter } from '../game/types.ts';

/**
 * Frame-timed temporary attack pose for fighters missing independently authored
 * HD combat clips. Draw-time translation/rotation only: feet pivot stays at
 * the ground anchor and the real CombatEngine has no idea this exists.
 */
function fallbackStrike(fighter: Fighter): { x: number; rotation: number } {
  const attack = fighter.attack;
  if (!attack) return { x: 0, rotation: 0 };
  const data = moveData(attack);
  let strength = 13;
  if (attack.move === 'ultimate') strength = 28;
  else if (attack.move === 'heavy') strength = 21;
  else if (attack.move === 'skill' || attack.combo === 3) strength = 17;
  const ease = (v: number): number => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  const elapsed = Math.max(0, attack.elapsed);
  if (elapsed < data.startup) {
    const anticipate = ease(elapsed / data.startup);
    return { x: -7 * anticipate, rotation: .025 * anticipate };
  }
  if (elapsed < data.startup + data.active) {
    const contact = (elapsed - data.startup) / data.active;
    return { x: strength + Math.sin(Math.PI * contact) * 3,
      rotation: -.048 - Math.sin(Math.PI * contact) * .012 };
  }
  const recover = 1 - ease((elapsed - data.startup - data.active) / data.recovery);
  return { x: strength * recover, rotation: -.048 * recover };
}

/** Temporary whole-sprite staging, never a claim that a missing pose has authored frames. */
export function spritePresentation(metadata: AtlasMetadata, fighter: Fighter, idleBounds?: { left: number; right: number }) {
  // Authored attack frames must follow the combat clock (not animationTime,
  // which can start/restart at an independent presentation tick).
  const combatPose = fighter.pose === 'light1' || fighter.pose === 'light2' ||
    fighter.pose === 'light3' || fighter.pose === 'heavy' ||
    fighter.pose === 'skill' || fighter.pose === 'ultimate';
  const time = combatPose && fighter.attack ? fighter.attack.elapsed : fighter.animationTime;
  const authored = sampleFrame(metadata, fighter.pose, time);
  const frame = authored ?? sampleFrame(metadata, 'idle', 0)!;
  const temporary = !authored;
  const down = temporary && fighter.pose === 'ko';
  const fallbackMotion = temporary && combatPose && fighter.attack
    ? fallbackStrike(fighter) : { x: 0, rotation: 0 };
  return {
    frame, temporary,
    // Missing art animates around the existing boot/ground pivot, not a new
    // sprite or hitbox. When authored art exists, its original pose wins.
    rotation: down ? Math.PI / 2 : fallbackMotion.rotation,
    x: down ? -frame.pivotY * metadata.scale / 2 : fallbackMotion.x + (temporary && fighter.pose === 'hurt' ? -5 : 0),
    y: down ? -(metadata.facing === 'left' ? frame.pivotX - (idleBounds?.left ?? 0) : (idleBounds?.right ?? frame.w) - frame.pivotX) * metadata.scale : 0,
  };
}
