import type { Fighter, FighterDefinition, FighterId, Direction } from './types.ts';

export const ROSTER: readonly FighterDefinition[] = [
  { id: 'Ali', title: 'DATA STRATEGIST', available: true, color: '#42d6ee', body: '#315e94', speed: 310,
    atlasUrl: '/assets/fighters/ali.json', ultimateName: 'HEIST PROTOCOL' },
  { id: 'Patrick', title: 'COMING SOON', available: false, color: '#7bb7f8', body: '#31517d', speed: 310 },
  { id: 'Niko', title: 'COMING SOON', available: false, color: '#67ccca', body: '#34536a', speed: 310 },
  { id: 'Marco', title: 'COMING SOON', available: false, color: '#a4cbff', body: '#4a5ed1', speed: 310 },
  { id: 'Lia', title: 'COMING SOON', available: false, color: '#ffce7d', body: '#4973af', speed: 310 },
  { id: 'Kris', title: 'COMING SOON', available: false, color: '#ffcb68', body: '#306397', speed: 310 },
  { id: 'Elton', title: 'SHADOW DEVELOPER', available: true, color: '#ff5c73', body: '#172440', speed: 310,
    atlasUrl: '/assets/fighters/elton.json', ultimateName: 'NIGHT DEPLOY' },
];
export function character(id: FighterId): FighterDefinition {
  const definition = ROSTER.find(fighter => fighter.id === id);
  if (!definition) throw new Error(`Unknown fighter: ${id}`);
  return definition;
}
export function createFighter(id: FighterId, x: number, face: Direction): Fighter {
  return { id, x, face, y: 570, vy: 0, hp: 100, meter: 0, guard: false, attack: null,
    stun: 0, knockback: 0, dashTime: 0, dashCooldown: 0, combo: 0, comboTime: 0, vx: 0, bufferedAttack: null, attackBufferTime: 0,
    pose: 'idle', animationTime: 0 };
}
