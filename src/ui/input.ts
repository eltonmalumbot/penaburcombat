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
  clear(): void { this.held.clear(); this.pressed.clear(); this.pointers.clear();
    document.querySelectorAll('.touch.is-pressed').forEach(button => button.classList.remove('is-pressed'));
  }
  bind(button: HTMLButtonElement, key: string): void {
    button.addEventListener('pointerdown', event => {
      if (!this.enabled) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, key); this.pressed.add(key);
      button.classList.add('is-pressed');
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(8);
    });
    const release = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId);
      if (![...this.pointers.values()].includes(key)) button.classList.remove('is-pressed');
    };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
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
