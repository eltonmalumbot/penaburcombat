export type FighterId = 'Ali' | 'Patrick' | 'Niko' | 'Marco' | 'Lia' | 'Kris' | 'Elton';
export type Move = 'light' | 'heavy' | 'skill' | 'ultimate';
export type Pose = 'idle' | 'walk' | 'jump' | 'fall' | 'guard' | 'light1' | 'light2' | 'light3' | 'heavy' | 'skill' | 'ultimate' | 'hurt' | 'ko' | 'victory';
export type Direction = -1 | 1;
export interface FighterDefinition {
  id: FighterId; title: string; available: boolean; color: string; body: string; speed: number;
  /** Optional URL of original/licensed art; missing atlases use the original Canvas stand-in. */
  atlasUrl?: string;
  ultimateName?: string;
}
export interface CombatInput { move: -1 | 0 | 1; guard: boolean; jump: boolean; dash: boolean; attack: Move | null }
export interface AttackState { move: Move; elapsed: number; combo: number; connected: boolean; queued: boolean }
export interface Fighter {
  id: FighterId; x: number; y: number; vy: number; hp: number; meter: number; face: Direction;
  guard: boolean; attack: AttackState | null; stun: number; knockback: number;
  dashTime: number; dashCooldown: number; combo: number; comboTime: number;
  vx: number; bufferedAttack: Move | null; attackBufferTime: number;
  pose: Pose; animationTime: number;
}
export interface Brain { thinkIn: number; guardFor: number; jumpCooldown: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface MoveData { startup: number; active: number; recovery: number; damage: number; reach: number; cost: number; stun: number; push: number }
export type Phase = 'ready' | 'active' | 'between' | 'done';
export interface Match {
  player: Fighter; cpu: Fighter; phase: Phase; round: number; score: [number, number];
  timer: number; phaseTime: number; result: 0 | 1 | null; notice: string; noticeTime: number;
}
export type CombatEvent = { type: 'hit'; x: number; y: number; color: string; blocked: boolean } | { type: 'round'; winner: 0 | 1 | null };
export const emptyInput = (): CombatInput => ({ move: 0, guard: false, jump: false, dash: false, attack: null });
