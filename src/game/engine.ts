import { character, createFighter } from './characters.ts';
import { createBrain, decideAI } from './ai.ts';
import { ARENA, clampX, grounded, hitbox, hurtbox, overlaps, resolvePushboxes } from './geometry.ts';
import { attackDuration, moveData } from './moves.ts';
import { emptyInput } from './types.ts';
import type { Brain, CombatEvent, CombatInput, Fighter, FighterId, Match, Move, Pose } from './types.ts';

export const FIXED_STEP = 1 / 60;
interface Options { ai?: boolean; random?: () => number; practice?: boolean }

export class CombatEngine {
  readonly state: Match;
  private brain: Brain = createBrain();
  private events: CombatEvent[] = [];
  private readonly ai: boolean;
  private readonly random: () => number;
  private readonly practice: boolean;

  constructor(selected: FighterId, options: Options = {}) {
    if (!character(selected).available) throw new Error(`${selected} is not playable yet`);
    this.practice = options.practice ?? false;
    this.ai = !this.practice && (options.ai ?? true);
    this.random = options.random ?? Math.random;
    this.state = { player: createFighter(selected, this.practice ? 490 : 360, 1),
      cpu: createFighter(selected === 'Ali' ? 'Elton' : 'Ali', this.practice ? 610 : 920, -1),
      phase: 'ready', round: 1, score: [0, 0], timer: 90, phaseTime: 1.7, result: null,
      notice: this.practice ? 'PRACTICE' : 'ROUND 1', noticeTime: 1.7,
      mode: this.practice ? 'practice' : 'vs',
      practiceStats: this.practice ? { hits: 0, damage: 0 } : undefined };
  }

  drainEvents(): CombatEvent[] { const events = this.events; this.events = []; return events; }

  /** Training-only reset: preserve the normal duel rules and never mutate its state. */
  resetPractice(): void {
    if (!this.practice) return;
    const g = this.state;
    g.player = createFighter(g.player.id, 490, 1);
    g.cpu = createFighter(g.cpu.id, 610, -1);
    g.phase = 'active'; g.round = 1; g.score = [0, 0]; g.timer = 90;
    g.phaseTime = 0; g.result = null;
    g.practiceStats = { hits: 0, damage: 0 };
    this.events = []; this.notice('PRACTICE RESET', .8);
  }

  /** Called at 60 Hz. No clocks, DOM, artwork or input listeners live in the simulation. */
  update(dt: number, playerInput: CombatInput = emptyInput(), cpuOverride?: CombatInput): void {
    if (!Number.isFinite(dt) || dt <= 0 || dt > FIXED_STEP + 1e-8) throw new Error('Use fixed steps of at most 1/60 second');
    const g = this.state;
    if (g.phase === 'done') return;
    g.noticeTime = Math.max(0, g.noticeTime - dt);
    if (!g.noticeTime) g.notice = '';
    if (g.phase !== 'active') {
      for (const fighter of [g.player, g.cpu]) { this.gravity(fighter, dt); this.animate(fighter, dt); }
      g.phaseTime -= dt;
      if (g.phaseTime <= 1e-8) {
        if (g.phase === 'ready') { g.phase = 'active'; this.notice('FIGHT!', .5); }
        else if (g.score.some(score => score >= 2)) {
          g.phase = 'done'; g.result = g.score[0] >= 2 ? 0 : 1;
          this.animate(g.result === 0 ? g.player : g.cpu, 0, 'victory');
        } else this.nextRound();
      }
      return;
    }
    const cpuInput = cpuOverride ?? (this.ai ? decideAI(g.cpu, g.player, this.brain, dt, this.random) : emptyInput());
    const order = Math.sign(g.player.x - g.cpu.x) || -g.player.face;
    this.updateFighter(g.player, playerInput, dt, 1);
    this.updateFighter(g.cpu, cpuInput, dt, .85);
    resolvePushboxes(g.player, g.cpu, order);
    // Gather both active hitboxes first so simultaneous strikes resolve as trades.
    const contacts = [[g.player, g.cpu], [g.cpu, g.player]].flatMap(([attacker, defender]) => {
      const box = hitbox(attacker);
      return attacker.attack && !attacker.attack.connected && box && overlaps(box, hurtbox(defender))
        ? [{ attacker, defender, attack: { ...attacker.attack } }] : [];
    });
    for (const contact of contacts) {
      if (contact.attacker.attack) contact.attacker.attack.connected = true;
      this.hit(contact.attacker, contact.defender, contact.attack);
    }
    if (this.practice) {
      // The passive dummy regenerates after a KO; the simulation still uses
      // exactly the same attack damage, startup, hitboxes and 60Hz rules.
      if (g.cpu.hp <= 0) { g.cpu.hp = 100; g.cpu.stun = 0; g.cpu.knockback = 0; }
      g.timer = 90;
    } else {
      g.timer = Math.max(0, g.timer - dt);
      if (g.player.hp <= 0 || g.cpu.hp <= 0 || g.timer <= 1e-8) this.finishRound();
    }
    this.animate(g.player, dt); this.animate(g.cpu, dt);
  }

  private notice(text: string, time: number): void { this.state.notice = text; this.state.noticeTime = time; }

  private updateFighter(f: Fighter, input: CombatInput, dt: number, speedScale: number): void {
    f.stun = Math.max(0, f.stun - dt);
    f.dashCooldown = Math.max(0, f.dashCooldown - dt);
    f.comboTime = Math.max(0, f.comboTime - dt);
    if (!f.comboTime && !f.attack) f.combo = 0;
    const enemy = f === this.state.player ? this.state.cpu : this.state.player;
    if (!f.attack && f.stun === 0) f.face = f.x <= enemy.x ? 1 : -1;
    f.guard = input.guard && grounded(f) && (f.stun === 0 || f.guard) && !f.attack && f.dashTime === 0;
    if (f.stun === 0 && f.hp > 0) {
      if (input.attack) this.beginAttack(f, input.attack);
      if (!f.attack && !f.guard) {
        if (input.jump && grounded(f)) f.vy = -850;
        if (input.dash && grounded(f) && f.dashCooldown === 0) { f.dashTime = .10; f.dashCooldown = .55; }
        if (f.dashTime > 0) {
          f.x += f.face * 880 * Math.min(dt, f.dashTime);
          f.dashTime = Math.max(0, f.dashTime - dt);
        } else f.x += input.move * character(f.id).speed * speedScale * dt;
      }
    }
    if (f.attack) {
      f.attack.elapsed += dt;
      if (f.attack.elapsed + 1e-8 >= attackDuration(f.attack)) {
        const ended = f.attack;
        f.attack = null;
        f.comboTime = ended.move === 'light' && ended.connected && ended.combo < 3 ? .24 : 0;
        if (ended.queued && ended.combo < 3) { f.comboTime = .24; this.beginAttack(f, 'light'); }
      }
    }
    f.x = clampX(f.x + f.knockback * dt);
    f.knockback = Math.sign(f.knockback) * Math.max(0, Math.abs(f.knockback) - 1100 * dt);
    this.gravity(f, dt);
    if (!f.attack && f.stun === 0 && !f.guard) this.animate(f, 0, input.move !== 0 || f.dashTime > 0 ? 'walk' : 'idle');
  }

  private gravity(f: Fighter, dt: number): void {
    if (!grounded(f) || f.vy < 0) {
      f.vy += 1900 * dt;
      f.y = Math.min(ARENA.floor, f.y + f.vy * dt);
      if (grounded(f)) f.vy = 0;
    }
  }

  private beginAttack(f: Fighter, move: Move): boolean {
    if (f.attack) {
      // A second tap during startup is buffered instead of being lost on touchscreens.
      // This changes input forgiveness only, not attack timing, damage or hitboxes.
      if (move === 'light' && f.attack.move === 'light' && f.attack.combo < 3) f.attack.queued = true;
      return false;
    }
    if (f.guard || f.stun > 0 || f.dashTime > 0) return false;
    const combo = move === 'light' ? (f.comboTime > 0 ? f.combo % 3 + 1 : 1) : 0;
    const cost = moveData({ move, combo }).cost;
    if (f.meter < cost) return false;
    f.meter -= cost;
    f.combo = combo; f.comboTime = 0;
    f.attack = { move, combo, elapsed: 0, connected: false, queued: false };
    if (move === 'ultimate') this.notice(`${f.id.toUpperCase()} ULTIMATE!`, .8);
    return true;
  }

  private hit(attacker: Fighter, defender: Fighter, attack: NonNullable<Fighter['attack']>): void {
    const data = moveData(attack);
    const blocked = defender.guard && grounded(defender) && defender.face === -attacker.face;
    const damage = blocked ? Math.max(1, Math.round(data.damage * .2)) : data.damage;
    if (this.practice && attacker === this.state.player && this.state.practiceStats) {
      this.state.practiceStats.hits++;
      this.state.practiceStats.damage += Math.min(defender.hp, damage);
    }
    defender.hp = Math.max(0, defender.hp - damage);
    defender.stun = blocked ? .09 : data.stun;
    defender.knockback = attacker.face * data.push * (blocked ? .35 : 1);
    defender.dashTime = 0;
    if (!blocked) { defender.attack = null; defender.combo = 0; defender.comboTime = 0; defender.guard = false; }
    attacker.meter = Math.min(100, attacker.meter + (attack.move === 'ultimate' ? 0 : blocked ? 5 : 12));
    defender.meter = Math.min(100, defender.meter + (blocked ? 9 : 7));
    this.events.push({ type: 'hit', x: defender.x - attacker.face * 25, y: Math.max(defender.y - 150, attacker.y - 175),
      color: character(attacker.id).color, blocked });
  }

  private finishRound(): void {
    const g = this.state;
    const winner = g.player.hp === g.cpu.hp ? null : g.player.hp > g.cpu.hp ? 0 : 1;
    if (winner !== null) g.score[winner]++;
    g.phase = 'between'; g.phaseTime = 2.1;
    const knockout = g.player.hp === 0 || g.cpu.hp === 0;
    this.notice(winner === null ? 'DRAW — REPLAY' : `${knockout ? 'KO! ' : 'TIME! '}${(winner === 0 ? g.player.id : g.cpu.id).toUpperCase()} WINS`, 2.1);
    for (const fighter of [g.player, g.cpu]) { fighter.attack = null; fighter.guard = false; fighter.dashTime = 0; }
    this.events.push({ type: 'round', winner });
  }

  private nextRound(): void {
    const g = this.state;
    g.player = createFighter(g.player.id, 360, 1); g.cpu = createFighter(g.cpu.id, 920, -1);
    g.round++; g.timer = 90; g.phase = 'ready'; g.phaseTime = 1.5;
    this.notice(`ROUND ${g.round}`, 1.5); this.brain = createBrain();
  }

  private animate(f: Fighter, dt: number, requested?: Pose): void {
    let pose = requested ?? f.pose;
    if (f.hp <= 0) pose = 'ko';
    else if (f.attack) pose = f.attack.move === 'light' ? `light${f.attack.combo}` as Pose : f.attack.move;
    else if (f.stun > 0) pose = 'hurt';
    else if (!grounded(f)) pose = f.vy < 0 ? 'jump' : 'fall';
    else if (f.guard) pose = 'guard';
    else if (['hurt', 'guard', 'jump', 'fall'].includes(pose)) pose = 'idle';
    if (f.pose !== pose) { f.pose = pose; f.animationTime = 0; }
    else f.animationTime += dt;
  }
}
