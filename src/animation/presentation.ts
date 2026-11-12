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
  if (elapsed === 0) return { x: 0, rotation: 0 };
  if (elapsed < data.startup) {
    const anticipate = ease(elapsed / data.startup);
    return { x: -7 * anticipate, rotation: .025 * anticipate };
  }
  if (elapsed < data.startup + data.active) {
    const contact = (elapsed - data.startup) / data.active;
    // Preserve the startup end pose at the boundary, then reach contact quickly.
    // This removes the one-frame pop from -7 to +strength pixels.
    const extend = ease(contact / .3);
    const pulse = Math.sin(Math.PI * contact);
    return { x: -7 + (strength + 7) * extend + pulse * 3,
      rotation: .025 - .073 * extend - pulse * .012 };
  }
  const recover = 1 - ease((elapsed - data.startup - data.active) / data.recovery);
  if (recover === 0) return { x: 0, rotation: 0 };
  return { x: strength * recover, rotation: -.048 * recover };
}

/** Return only the active strike that actually owns the visible pose. */
export function presentingAttack(fighter: Fighter) {
  const attack = fighter.attack;
  if (!attack) return null;
  const pose = attack.move === 'light' ? `light${attack.combo}` : attack.move;
  return fighter.pose === pose ? attack : null;
}

/** Temporary whole-sprite staging, never a claim that a missing pose has authored frames. */
export function spritePresentation(metadata: AtlasMetadata, fighter: Fighter, idleBounds?: { left: number; right: number }) {
  // Only the attack whose move/combo matches the displayed pose owns the
  // animation clock. A stale or interrupted attack must not drive another clip.
  const currentAttack = presentingAttack(fighter);
  const time = currentAttack ? currentAttack.elapsed : fighter.animationTime;
  const authored = sampleFrame(metadata, fighter.pose, time);
  const frame = authored ?? sampleFrame(metadata, 'idle', 0)!;
  const temporary = !authored;
  const down = temporary && fighter.pose === 'ko';
  const fallbackMotion = temporary && currentAttack
    ? fallbackStrike(fighter) : { x: 0, rotation: 0 };
  let offsetX = fallbackMotion.x;
  if (down) offsetX = -frame.pivotY * metadata.scale / 2;
  else if (temporary && fighter.pose === 'hurt') offsetX = -5;
  return {
    frame, temporary,
    // Missing art animates around the existing boot/ground pivot, not a new
    // sprite or hitbox. When authored art exists, its original pose wins.
    rotation: down ? Math.PI / 2 : fallbackMotion.rotation,
    x: offsetX,
    y: down ? -(metadata.facing === 'left' ? frame.pivotX - (idleBounds?.left ?? 0) : (idleBounds?.right ?? frame.w) - frame.pivotX) * metadata.scale : 0,
  };
}
