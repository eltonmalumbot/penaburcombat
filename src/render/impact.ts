import type { CombatEvent } from '../game/types.ts';

/** Visual-only hit feedback. Does not interact with simulation, collisions or attacks. */
export interface ImpactCue {
  x: number; y: number; color: string; blocked: boolean;
  age: number; duration: number;
}

export const MAX_IMPACT_CUES = 10;

type HitEvent = Extract<CombatEvent, { type: 'hit' }>;

/** One cue per confirmed combat contact; bounded even during frantic exchanges. */
export function addImpactCue(existing: readonly ImpactCue[], event: HitEvent): ImpactCue[] {
  const cue: ImpactCue = {
    x: event.x, y: event.y, color: event.color, blocked: event.blocked,
    age: 0, duration: event.blocked ? .24 : .32,
  };
  return [...existing.slice(-(MAX_IMPACT_CUES - 1)), cue];
}

/** Advance with the renderer's capped, unpaused frame time only. */
export function advanceImpactCues(cues: readonly ImpactCue[], dt: number): ImpactCue[] {
  if (!Number.isFinite(dt) || dt <= 0) return [...cues];
  const elapsed = Math.min(dt, .1);
  return cues.map(cue => ({ ...cue, age: cue.age + elapsed }))
    .filter(cue => cue.age < cue.duration);
}

export function drawImpactCues(ctx: CanvasRenderingContext2D, cues: readonly ImpactCue[]): void {
  for (const cue of cues) {
    const progress = Math.max(0, Math.min(1, cue.age / cue.duration));
    const fade = Math.max(0, 1 - progress);
    const radius = cue.blocked ? 26 + 18 * progress : 21 + 46 * progress;
    ctx.save();
    ctx.translate(cue.x, cue.y);
    ctx.globalAlpha *= fade;
    ctx.lineCap = 'round';
    if (cue.blocked) {
      // Shield-like blue arc conveys a successful guard, distinct from a landed hit.
      ctx.strokeStyle = '#b6e9ff';
      ctx.lineWidth = 5 * (1 - .4 * progress);
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI * .82, Math.PI * .82);
      ctx.stroke();
      ctx.strokeStyle = cue.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * .64, -Math.PI * .8, Math.PI * .8);
      ctx.stroke();
    } else {
      // Two expanding shock rings with deterministic radial streaks; no image assets.
      ctx.strokeStyle = '#fff4df';
      ctx.lineWidth = 7 * (1 - .6 * progress);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = cue.color;
      ctx.lineWidth = 3.5 * (1 - .45 * progress);
      ctx.beginPath();
      ctx.arc(0, 0, radius * .65, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + .16;
        const from = radius + 4, to = radius + 23 * (1 - progress);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * from, Math.sin(angle) * from);
        ctx.lineTo(Math.cos(angle) * to, Math.sin(angle) * to);
        ctx.stroke();
      }
    }
    ctx.globalAlpha *= Math.min(1, (1 - progress) * 1.5);
    ctx.font = '900 20px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#10223d';
    ctx.fillStyle = cue.blocked ? '#b6e9ff' : '#fff4df';
    const label = cue.blocked ? 'BLOCK' : 'HIT!';
    const rise = 54 + 22 * progress;
    ctx.strokeText(label, 0, -rise);
    ctx.fillText(label, 0, -rise);
    ctx.restore();
  }
}
