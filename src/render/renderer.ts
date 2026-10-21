import { character } from '../game/characters.ts';
import { ARENA } from '../game/geometry.ts';
import { moveData } from '../game/moves.ts';
import type { CombatEvent, Fighter, FighterId, Match } from '../game/types.ts';
import { loadAtlas, sampleFrame } from '../animation/atlas.ts';
import type { SpriteAtlas } from '../animation/atlas.ts';

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}

/** Static portraits share the fight atlas/cache and keep a drawn fallback while loading. */
export async function drawPortraits(canvas: HTMLCanvasElement, portraits: readonly { fighter: Fighter; scale: number }[]): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const paint = (atlases: (SpriteAtlas | undefined)[]) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    portraits.forEach(({ fighter, scale }, i) => drawFighter(ctx, fighter, scale, atlases[i]));
  };
  paint([]);
  const atlases = await Promise.all(portraits.map(async ({ fighter }) => {
    const url = character(fighter.id).atlasUrl;
    if (!url) return undefined;
    try { return await loadAtlas(url); } catch { return undefined; }
  }));
  if (canvas.isConnected) {
    paint(atlases);
    canvas.dataset.artwork = atlases.every(Boolean) ? 'hd' : 'fallback';
  }
}

/** Original geometric stand-in artwork, retained while approved sprite assets are prepared. */
export function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, scale = 1, atlas?: SpriteAtlas): void {
  const theme = character(f.id), t = f.animationTime;
  ctx.save(); ctx.translate(f.x, f.y);
  ctx.fillStyle = '#07132977'; ctx.beginPath(); ctx.ellipse(0, 0, 54 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.scale(f.face * scale, scale);
  const frame = atlas ? sampleFrame(atlas.metadata, f.pose, t) : null;
  if (atlas && frame) {
    const size = atlas.metadata.scale;
    if (atlas.metadata.facing === 'left') ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = atlas.metadata.sampling === 'smooth';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(atlas.image, frame.x, frame.y, frame.w, frame.h, -frame.pivotX * size, -frame.pivotY * size, frame.w * size, frame.h * size);
    ctx.restore(); return;
  }
  if (f.pose === 'ko') { ctx.rotate(Math.PI / 2); ctx.scale(.8, .8); }
  if (f.pose === 'hurt') ctx.rotate(-.07);
  if (f.pose === 'walk') ctx.rotate(.035);
  const stride = f.pose === 'walk' ? Math.sin(t * 20) * 12 : 0;
  const bob = f.pose === 'idle' || f.pose === 'guard' ? Math.sin(t * 4) * 2 : 0;
  ctx.translate(0, bob);
  rect(ctx, -37 + stride, -18, 33, 16, '#12223b'); rect(ctx, 5 - stride, -18, 33, 16, '#12223b');
  rect(ctx, -32 + stride, -86, 24, 77, '#263752'); rect(ctx, 8 - stride, -86, 24, 77, '#263752');
  rect(ctx, -44, -176, 88, 108, theme.body); rect(ctx, -26, -163, 52, 69, '#9fc4dd');
  rect(ctx, -18, -158, 36, 11, '#f2e9dc'); rect(ctx, -45, -124, 90, 13, '#1b2742');
  rect(ctx, -52, -151, 15, 68, '#132238'); rect(ctx, -65, -141, 18, 63, theme.color); rect(ctx, 37, -149, 17, 59, theme.color);
  if (f.guard) {
    rect(ctx, 18, -175, 40, 15, '#dec0a4'); rect(ctx, -50, -190, 35, 15, '#dec0a4');
    ctx.strokeStyle = '#bfeeff99'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(30, -150, 82, -1.3, 1.3); ctx.stroke();
  } else if (f.attack) {
    const data = moveData(f.attack), active = f.attack.elapsed >= data.startup && f.attack.elapsed < data.startup + data.active;
    const reach = active ? Math.min(data.reach - 10, 160) : 65;
    rect(ctx, 31, -155, reach - 22, 20, '#edc09c');
    ctx.fillStyle = theme.color; ctx.beginPath(); ctx.arc(reach + 8, -145, active ? 22 : 16, 0, Math.PI * 2); ctx.fill();
    if (active && (f.attack.move === 'skill' || f.attack.move === 'ultimate')) {
      ctx.globalAlpha = .55; rect(ctx, 45, -205, data.reach - 45, f.attack.move === 'ultimate' ? 172 : 130, theme.color);
      ctx.globalAlpha = 1;
    }
    if (f.attack.move === 'light') { ctx.font = '900 23px system-ui'; ctx.fillStyle = theme.color; ctx.fillText(`${f.attack.combo} HIT`, -60, -312); }
  } else if (f.pose === 'victory') {
    rect(ctx, 38, -245, 16, 105, '#edc09c'); rect(ctx, -50, -120, 15, 41, '#edc09c');
  } else {
    rect(ctx, 38, -126 - stride, 15, 41, '#edc09c'); rect(ctx, -50, -120 + stride, 15, 41, '#edc09c');
  }
  rect(ctx, -17, -195, 34, 26, '#dba781');
  ctx.fillStyle = '#edbc94'; ctx.beginPath(); ctx.ellipse(0, -228, 59, 61, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#192237'; ctx.beginPath(); ctx.ellipse(0, -274, 58, 24, 0, 0, Math.PI * 2); ctx.fill();
  rect(ctx, -53, -268, 105, 26, '#192237'); rect(ctx, -32, -234, 15, 7, '#192237'); rect(ctx, 19, -234, 15, 7, '#192237');
  ctx.fillStyle = '#172642'; ctx.beginPath(); ctx.arc(-22, -221, 6, 0, 7); ctx.arc(22, -221, 6, 0, 7); ctx.fill();
  rect(ctx, -11, -202, 22, 3, '#a95c64');
  if (f.id === 'Elton') { rect(ctx, -65, -230, 14, 41, '#111a32'); rect(ctx, 51, -230, 14, 41, '#111a32'); }
  if (f.attack?.move === 'ultimate') {
    ctx.strokeStyle = theme.color; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -150, 110 + Math.sin(t * 20) * 8, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawArena(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, 720);
  gradient.addColorStop(0, '#1e3457'); gradient.addColorStop(1, '#536583');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 14; i++) { rect(ctx, i * 98, 55, 76, 350, '#213b58'); rect(ctx, i * 98 + 8, 65, 60, 340, '#46627f'); rect(ctx, i * 98 + 36, 65, 4, 340, '#243b57'); }
  rect(ctx, 290, 82, 700, 262, '#172538'); rect(ctx, 309, 101, 663, 223, '#efe9d7');
  ctx.textAlign = 'center'; ctx.fillStyle = '#263956'; ctx.font = 'bold 38px system-ui'; ctx.fillText('MEETING MENDADAK', 640, 173);
  ctx.font = 'bold 80px system-ui'; ctx.fillStyle = '#c2576a'; ctx.fillText('16:59', 640, 273);
  rect(ctx, 0, 560, 1280, 160, '#4d5e76');
  ctx.strokeStyle = '#738398'; ctx.beginPath();
  for (let i = 0; i < 16; i++) { ctx.moveTo(i * 90, 560); ctx.lineTo(i * 135 - 220, 720); } ctx.stroke();
  rect(ctx, 45, 360, 210, 210, '#283850');
  for (let i = 0; i < 3; i++) rect(ctx, 65, 379 + i * 64, 168, 54, '#41526d');
  rect(ctx, 1005, 418, 220, 17, '#a4a9a5'); rect(ctx, 1025, 435, 15, 132, '#53647a'); rect(ctx, 1195, 435, 15, 132, '#53647a');
  rect(ctx, 1030, 318, 151, 93, '#1e2e45'); rect(ctx, 1043, 328, 125, 68, '#487da0');
}

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }
export class GameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stage = document.createElement('canvas');
  private readonly atlases = new Map<FighterId, SpriteAtlas>();
  private preparation = 0;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private sparks: Spark[] = [];
  private shake = 0;
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable in this browser');
    this.ctx = ctx; this.stage.width = ARENA.width; this.stage.height = ARENA.height;
    drawArena(this.stage.getContext('2d')!); this.resize();
  }

  async prepare(fighters: readonly FighterId[]): Promise<void> {
    const preparation = ++this.preparation;
    const ready = await Promise.all(fighters.map(async id => {
      const url = character(id).atlasUrl;
      if (url) {
        try { return [id, await loadAtlas(url)] as const; }
        catch (error) { console.warn(`Using original Canvas art for ${id}:`, error); }
      }
      return [id, null] as const;
    }));
    // Replace the pair together: no half-loaded matchup, stale atlas or late request overwrite.
    if (preparation !== this.preparation) return;
    for (const [id, atlas] of ready) {
      if (atlas) this.atlases.set(id, atlas);
      else this.atlases.delete(id);
    }
  }

  resize(): void {
    const width = this.canvas.getBoundingClientRect().width || 1280;
    const scale = Math.max(.3, Math.min(2, width / 1280 * Math.min(2, window.devicePixelRatio || 1)));
    this.canvas.width = Math.round(1280 * scale); this.canvas.height = Math.round(720 * scale);
  }

  effects(events: CombatEvent[]): void {
    for (const event of events) {
      if (event.type !== 'hit' || this.reducedMotion) continue;
      this.shake = event.blocked ? 2 : 6;
      for (let i = 0; i < 12 && this.sparks.length < 144; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.sparks.push({ x: event.x, y: event.y, vx: Math.cos(angle) * 200, vy: Math.sin(angle) * 200, life: .3, color: event.color });
      }
    }
  }

  draw(match: Match, dt: number, paused: boolean): void {
    const ctx = this.ctx;
    if (!paused) {
      this.time += dt; this.shake = Math.max(0, this.shake - dt * 24);
      this.sparks = this.sparks.filter(spark => spark.life > 0);
      for (const spark of this.sparks) { spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 600 * dt; spark.life -= dt; }
    }
    ctx.setTransform(this.canvas.width / 1280, 0, 0, this.canvas.height / 720, 0, 0);
    ctx.drawImage(this.stage, 0, 0);
    ctx.save(); ctx.translate(Math.sin(this.time * 85) * this.shake, Math.cos(this.time * 93) * this.shake);
    drawFighter(ctx, match.player, 1, this.atlases.get(match.player.id));
    drawFighter(ctx, match.cpu, 1, this.atlases.get(match.cpu.id));
    for (const spark of this.sparks) { ctx.globalAlpha = Math.max(0, Math.min(1, spark.life * 3)); rect(ctx, spark.x, spark.y, 7, 7, spark.color); }
    ctx.restore(); this.hud(match);
    if (paused) {
      rect(ctx, 0, 0, 1280, 720, '#081020bb'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 70px system-ui';
      ctx.fillText('PAUSED', 640, 335); ctx.font = '24px system-ui'; ctx.fillText('Press P or RESUME to continue', 640, 390);
    }
  }

  private hud(match: Match): void {
    const ctx = this.ctx;
    for (const [i, f] of [match.player, match.cpu].entries()) {
      const x = i === 0 ? 28 : 717, health = 530 * f.hp / 100, meter = 440 * f.meter / 100;
      rect(ctx, x, 23, 538, 38, '#0b1937');
      rect(ctx, x + 4 + (i === 1 ? 530 - health : 0), 27, health, 30, character(f.id).color);
      rect(ctx, x + (i === 1 ? 98 : 0), 67, 440, 12, '#14233c');
      rect(ctx, x + (i === 1 ? 538 - meter : 0), 67, meter, 12, f.meter >= 65 ? '#ffe5a1' : '#f5d17a');
      ctx.fillStyle = '#fff'; ctx.textAlign = i === 0 ? 'left' : 'right'; ctx.font = 'bold 26px system-ui'; ctx.fillText(f.id.toUpperCase(), i === 0 ? x : x + 538, 116);
      ctx.font = 'bold 15px system-ui'; ctx.fillStyle = f.meter >= 65 ? '#ffe5a1' : '#b3c8dd';
      const ultimate = character(f.id).ultimateName ?? 'ULTIMATE';
      ctx.fillText(f.meter >= 65 ? `${ultimate} [U]` : `METER ${Math.floor(f.meter)} / 100 · ${ultimate}`, i === 0 ? x : x + 538, 141);
    }
    rect(ctx, 565, 4, 153, 104, '#0a1939'); ctx.fillStyle = '#ffe7b1'; ctx.textAlign = 'center'; ctx.font = 'bold 54px system-ui';
    ctx.fillText(String(Math.ceil(match.timer)), 641, 62); ctx.font = 'bold 16px system-ui';
    ctx.fillText(`ROUND ${match.round} • ${match.score[0]} : ${match.score[1]}`, 641, 95);
    if (match.notice) {
      const fighter = [match.player, match.cpu].find(f => match.notice === `${f.id.toUpperCase()} ULTIMATE!`);
      const notice = fighter ? `${fighter.id.toUpperCase()} · ${character(fighter.id).ultimateName ?? 'ULTIMATE'}` : match.notice;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#142541'; ctx.lineWidth = 8;
      ctx.font = `900 ${notice.length > 18 ? 42 : 64}px system-ui`;
      ctx.strokeText(notice, 640, 331); ctx.fillText(notice, 640, 331);
    }
  }
}
