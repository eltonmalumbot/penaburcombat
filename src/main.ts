import './style.css';
import { CombatEngine, FIXED_STEP } from './game/engine.ts';
import type { FighterId } from './game/types.ts';
import { GameRenderer } from './render/renderer.ts';
import { InputController } from './ui/input.ts';
import { Screens } from './ui/screens.ts';

let selected: FighterId = 'Ali';
let engine: CombatEngine | null = null, renderer: GameRenderer | null = null;
let paused = false, accumulator = 0, lastTime = 0, statusTime = 0;
const resize = new ResizeObserver(() => renderer?.resize());
const input = new InputController(togglePause, showSelection, () => setPaused(true));
const root = document.querySelector<HTMLDivElement>('#app')!;
const screens = new Screens(root, { menu: showMenu, select: showSelection,
  choose: id => { selected = id; showSelection(); }, start: startMatch, pause: togglePause });

function leaveMatch(): void {
  input.setEnabled(false); resize.disconnect(); engine = null; renderer = null; paused = false; accumulator = 0;
}
function showMenu(): void { leaveMatch(); screens.menu(); }
function showSelection(): void { leaveMatch(); screens.select(selected); }
function startMatch(): void {
  leaveMatch(); engine = new CombatEngine(selected);
  const canvas = screens.fight(input); renderer = new GameRenderer(canvas);
  void renderer.prepare([engine.state.player.id, engine.state.cpu.id]);
  resize.observe(canvas); input.setEnabled(true); screens.update(engine.state, paused); statusTime = 0;
}
function setPaused(value: boolean): void {
  if (!engine) return;
  paused = value; accumulator = 0; input.clear(); screens.update(engine.state, paused);
}
function togglePause(): void { setPaused(!paused); }

function tick(time: number): void {
  const dt = Math.max(0, Math.min(.1, (time - (lastTime || time)) / 1000)); lastTime = time;
  if (engine && renderer) {
    if (!paused) {
      accumulator += dt;
      while (accumulator + 1e-8 >= FIXED_STEP) {
        engine.update(FIXED_STEP, input.sample());
        accumulator = Math.max(0, accumulator - FIXED_STEP);
      }
      renderer.effects(engine.drainEvents());
    } else input.sample();
    renderer.draw(engine.state, dt, paused); statusTime += dt;
    if (statusTime >= .1) { screens.update(engine.state, paused); statusTime = 0; }
    if (engine.state.phase === 'done') {
      const result = engine.state; leaveMatch(); screens.result(result);
    }
  } else { accumulator = 0; input.sample(); }
  requestAnimationFrame(tick);
}
showMenu(); requestAnimationFrame(tick);
