import type { Fighter, Rect } from './types.ts';
import { moveData } from './moves.ts';

export const ARENA = { width: 1280, height: 720, floor: 570, left: 66, right: 1214 } as const;
export const clampX = (x: number): number => Math.max(ARENA.left, Math.min(ARENA.right, x));
export const grounded = (fighter: Fighter): boolean => fighter.y >= ARENA.floor - .001;
export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const hurtbox = (fighter: Fighter): Rect => ({ x: fighter.x - 34, y: fighter.y - 270, w: 68, h: 262 });
export const pushbox = (fighter: Fighter): Rect => ({ x: fighter.x - 38, y: fighter.y - 126, w: 76, h: 126 });
export function hitbox(fighter: Fighter): Rect | null {
  if (!fighter.attack) return null;
  const data = moveData(fighter.attack);
  if (fighter.attack.elapsed + 1e-8 < data.startup || fighter.attack.elapsed >= data.startup + data.active) return null;
  return { x: fighter.face === 1 ? fighter.x + 24 : fighter.x - data.reach, y: fighter.y - 215,
    w: data.reach - 24, h: fighter.attack.move === 'ultimate' ? 190 : 145 };
}

/** Split penetration, then give wall-constrained space to the other fighter. */
export function resolvePushboxes(a: Fighter, b: Fighter, previousOrder: number): void {
  const pa = pushbox(a), pb = pushbox(b);
  if (pa.y >= pb.y + pb.h || pb.y >= pa.y + pa.h) return;
  const distance = Math.abs(a.x - b.x);
  const crossed = (a.x - b.x) * previousOrder < 0;
  if (distance >= 76 && !crossed) return;
  // Fixed steps normally cannot tunnel; preserve ordering even for an unusually large dash.
  const aIsLeft = previousOrder < 0;
  const left = aIsLeft ? a : b, right = aIsLeft ? b : a;
  const penetration = 76 - (right.x - left.x);
  left.x = clampX(left.x - penetration / 2);
  right.x = clampX(right.x + penetration / 2);
  const remaining = 76 - (right.x - left.x);
  if (remaining > 0) {
    if (left.x === ARENA.left) right.x = clampX(right.x + remaining);
    else left.x = clampX(left.x - remaining);
  }
}
