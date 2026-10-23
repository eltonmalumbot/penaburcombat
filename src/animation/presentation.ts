import { sampleFrame } from './atlas.ts';
import type { AtlasMetadata } from './atlas.ts';
import type { Fighter } from '../game/types.ts';

/** Temporary whole-sprite staging, never a claim that a missing pose has authored frames. */
export function spritePresentation(metadata: AtlasMetadata, fighter: Fighter, idleBounds?: { left: number; right: number }) {
  // Combat visuals must sample the authoritative strike clock. animationTime
  // can restart independently (pose changes, repeated LIGHT or pause/resume)
  // and is only appropriate for idle, walk and non-attack presentations.
  const combatPose = fighter.pose === 'light1' || fighter.pose === 'light2'
    || fighter.pose === 'light3' || fighter.pose === 'heavy'
    || fighter.pose === 'skill' || fighter.pose === 'ultimate';
  const clock = combatPose && fighter.attack ? fighter.attack.elapsed : fighter.animationTime;
  const authored = sampleFrame(metadata, fighter.pose, clock);
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
