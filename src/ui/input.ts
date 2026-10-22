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
    // A pause, page hide or rematch must never leave a button visibly held.
    const captured = [...this.pointerButtons];
    this.pointerButtons.clear();
    for (const [, button] of captured) button.classList.remove('is-held');
    for (const [pointerId, button] of captured) {
      try {
        if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
      } catch { /* Capture may already have ended as the page was removed. */ }
    }
  }
  bind(button: HTMLButtonElement, key: string): void {
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('pointerdown', event => {
      if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      // Pointer capture keeps press/release paired even when a thumb slides away.
      try { button.setPointerCapture(event.pointerId); }
      catch { /* Some touch browsers lack active capture during a synthetic event. */ }
      this.pointers.set(event.pointerId, key);
      this.pointerButtons.set(event.pointerId, button);
      button.classList.add('is-held');
      this.pressed.add(key);
    });
    const release = (event: PointerEvent) => {
      const pressed = this.pointerButtons.get(event.pointerId);
      if (pressed !== button) return;
      this.pointerButtons.delete(event.pointerId);
      this.pointers.delete(event.pointerId);
      // Two fingers may be touching the same button; keep its feedback until both release.
      if (![...this.pointerButtons.values()].includes(button)) button.classList.remove('is-held');
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
