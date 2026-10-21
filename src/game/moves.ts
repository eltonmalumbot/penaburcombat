import type { AttackState, MoveData } from './types.ts';

export function moveData(attack: Pick<AttackState, 'move' | 'combo'>): MoveData {
  switch (attack.move) {
    case 'light': return { startup: attack.combo === 3 ? .12 : .08, active: .09, recovery: .18,
      damage: [7, 9, 12][attack.combo - 1] ?? 7, reach: attack.combo === 3 ? 142 : 118,
      cost: 0, stun: attack.combo === 3 ? .34 : .24, push: attack.combo === 3 ? 220 : 85 };
    case 'heavy': return { startup: .20, active: .12, recovery: .30, damage: 16, reach: 155, cost: 0, stun: .40, push: 270 };
    case 'skill': return { startup: .23, active: .14, recovery: .29, damage: 14, reach: 295, cost: 20, stun: .30, push: 180 };
    case 'ultimate': return { startup: .40, active: .25, recovery: .50, damage: 35, reach: 390, cost: 65, stun: .60, push: 420 };
  }
}
export function attackDuration(attack: AttackState): number {
  const data = moveData(attack);
  return data.startup + data.active + data.recovery;
}
