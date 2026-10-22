import { sampleFrame } from './atlas.ts';
import type { AtlasMetadata } from './atlas.ts';
import type { Fighter } from '../game/types.ts';

/** Temporary whole-sprite staging, never a claim that a missing pose has authored frames. */
export function spritePresentation(metadata: AtlasMetadata, fighter: Fighter, idleBounds?: { left: number; right: number }) {
  // The simulation clock is authoritative for strikes, including consecutive
  // attacks with the same pose (which do not reset the general pose clock).
  const attack = fighter.attack;
  const attackPose = attack?.move === 'light' ? `light${attack.combo}` : attack?.move;
  const elapsed = attack && fighter.pose === attackPose ? attack.elapsed : fighter.animationTime;
  const authored = sampleFrame(metadata, fighter.pose, elapsed);
  const frame = authored ?? sampleFrame(metadata, 'idle', 0)!;
  const temporary = !authored;
  const down = temporary && fighter.pose === 'ko';
  return {
    frame, temporary,
    // Lay the unmodified cutout on its side; its opaque silhouette rests on the ground.
    rotation: down ? Math.PI / 2 : 0,
    x: down ? -frame.pivotY * metadata.scale / 2 : temporary && fighter.pose === 'hurt' ? -5 : 0,
    y: down ? -(metadata.facing === 'left' ? frame.pivotX - (idleBounds?.left ?? 0) : (idleBounds?.right ?? frame.w) - frame.pivotX) * metadata.scale : 0,
  };
}
