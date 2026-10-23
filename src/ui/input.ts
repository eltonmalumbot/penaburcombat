import { emptyInput } from '../game/types.ts';
import type { CombatInput, Move } from '../game/types.ts';

const aliases: Record<string, string> = { arrowleft: 'a', arrowright: 'd', arrowup: 'w', arrowdown: 's', ' ': 'w' };
const controls = new Set(['a', 'd', 'w', 's', 'j', 'k', 'l', 'u', 'shift']);
const attacks: Record<string, Move> = { j: 'light', k: 'heavy', l: 'skill', u: 'ultimate' };
export class InputController {
  private enabled = false;
  private readonly held = new Map<string, string>();
  private readonly pressed = new Set<string>();
  private readonly pointers = new Map<number, string>();
  private readonly pointerButtons = new Map<number, HTMLButtonElement>();
  private readonly pointerOrigins = new Map<number, HTMLButtonElement>();
  private readonly touchStarts = new Map<number, { key: string; at: number; x: number; y: number; dash: boolean; multitouch: boolean }>();
  private lastDirectionTap: { key: string; at: number } | null = null;

  constructor(onPause: () => void, onExit: () => void, onBlur: () => void) {
    window.addEventListener('keydown', event => {
      if (!this.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
      const raw = event.key.toLowerCase(), key = aliases[raw] ?? raw;
      if (controls.has(key) || key === 'p' || key === 'escape') event.preventDefault();
      if (event.repeat) return;
      if (key === 'p') { this.clear(); onPause(); return; }
      if (key === 'escape') { this.clear(); onExit(); return; }
      if (controls.has(key)) {
        if (![...this.held.values()].includes(key)) this.pressed.add(key);
        this.held.set(event.code || raw, key);
      }
    });
    window.addEventListener('keyup', event => {
      this.held.delete(event.code || event.key.toLowerCase());
    });
    const blur = () => { this.clear(); if (this.enabled) onBlur(); };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', () => { if (document.hidden) blur(); });
  }
  setEnabled(enabled: boolean): void { this.enabled = enabled; this.clear(); }
  clear(): void {
    this.held.clear(); this.pressed.clear(); this.pointers.clear();
    this.lastDirectionTap = null;
    const active = [...this.pointerOrigins];
    for (const button of new Set(this.pointerButtons.values())) button.classList.remove('is-held');
    this.pointerButtons.clear(); this.pointerOrigins.clear(); this.touchStarts.clear();
    for (const [pointerId, origin] of active) {
      try {
        if (origin.hasPointerCapture(pointerId)) origin.releasePointerCapture(pointerId);
      } catch { /* Capture may already have been lost as the screen changed. */ }
    }
  }

  /** Retarget a captured finger within its original D-pad, never across to attack buttons. */
  private retarget(pointerId: number, key: string, button: HTMLButtonElement): void {
    const previous = this.pointerButtons.get(pointerId);
    const oldKey = this.pointers.get(pointerId);
    if (previous === button) return;
    this.pointerButtons.set(pointerId, button);
    this.pointers.set(pointerId, key);
    button.classList.add('is-held');
    if (key !== oldKey) this.lastDirectionTap = null;
    if (previous && ![...this.pointerButtons.values()].includes(previous)) previous.classList.remove('is-held');
    // Sliding onto jump is a fresh jump press, but never fires a second attack.
    if (key !== oldKey) this.pressed.add(key);
  }

  bind(button: HTMLButtonElement, key: string): void {
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      try { button.setPointerCapture(event.pointerId); }
      catch { /* Active pointer capture isn't available on every platform. */ }
      const now = performance.now();
      const direction = key === 'a' || key === 'd';
      // A Dash requires a *completed* first tap. Parallel thumbs and long
      // movement holds must not accidentally count as double-taps.
      const alreadyTouching = this.pointerOrigins.size > 0;
      if (alreadyTouching) for (const start of this.touchStarts.values()) start.multitouch = true;
      const dash = event.pointerType === 'touch' && direction && !alreadyTouching
        && this.lastDirectionTap?.key === key && now - this.lastDirectionTap.at <= 280;
      this.pointerOrigins.set(event.pointerId, button);
      this.pointerButtons.set(event.pointerId, button);
      this.pointers.set(event.pointerId, key);
      if (event.pointerType === 'touch') this.touchStarts.set(event.pointerId, {
        key, at: now, x: event.clientX, y: event.clientY, dash: Boolean(dash), multitouch: alreadyTouching,
      });
      button.classList.add('is-held');
      this.pressed.add(key);
      if (dash) this.pressed.add('shift');
      // The previous tap is consumed, including on a valid second tap.
      if (direction || key === 's' || key === 'w') this.lastDirectionTap = null;
    });
    if (key === 'a' || key === 'd' || key === 's' || key === 'w') {
      button.addEventListener('pointermove', event => {
        if (this.pointerOrigins.get(event.pointerId) !== button || event.pointerType !== 'touch') return;
        const beneath = document.elementFromPoint(event.clientX, event.clientY);
        const target = beneath?.closest<HTMLButtonElement>('button.touch');
        if (target && target.parentElement === button.parentElement) {
          const nextKey = target.dataset.key;
          if (nextKey && ['a', 'd', 'w', 's'].includes(nextKey)) this.retarget(event.pointerId, nextKey, target);
        }
      });
    }
    const release = (event: PointerEvent) => {
      if (this.pointerOrigins.get(event.pointerId) !== button) return;
      const pressed = this.pointerButtons.get(event.pointerId);
      const actualKey = this.pointers.get(event.pointerId);
      const start = this.touchStarts.get(event.pointerId);
      const duration = start ? performance.now() - start.at : Infinity;
      const drift = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) : Infinity;
      this.pointerOrigins.delete(event.pointerId);
      this.pointerButtons.delete(event.pointerId);
      this.pointers.delete(event.pointerId);
      this.touchStarts.delete(event.pointerId);
      // Only quick, stationary, fully released first taps may set up a Dash.
      // Cancel and lost capture must never arm a gesture.
      if (event.type === 'pointerup' && start && (start.key === 'a' || start.key === 'd')
        && actualKey === start.key && !start.dash && !start.multitouch
        && duration < 230 && drift < 26 && this.pointerOrigins.size === 0) {
        this.lastDirectionTap = { key: start.key, at: performance.now() };
      } else if (start && (start.key === 'a' || start.key === 'd')) this.lastDirectionTap = null;
      if (pressed && ![...this.pointerButtons.values()].includes(pressed)) pressed.classList.remove('is-held');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }
  sample(): CombatInput {
    if (!this.enabled) return emptyInput();
    const down = (key: string) => [...this.held.values()].includes(key) || [...this.pointers.values()].includes(key);
    const result: CombatInput = { move: (Number(down('d')) - Number(down('a'))) as -1 | 0 | 1,
      guard: down('s'), jump: this.pressed.has('w'), dash: this.pressed.has('shift'), attack: null };
    for (const key of ['u', 'l', 'k', 'j']) if (this.pressed.has(key)) { result.attack = attacks[key]; break; }
    this.pressed.clear(); return result;
  }
}
