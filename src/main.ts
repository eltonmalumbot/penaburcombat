import './style.css';
import { CombatEngine, FIXED_STEP } from './game/engine.ts';
import type { FighterId } from './game/types.ts';
import { GameRenderer } from './render/renderer.ts';
import { loadAliForReview } from './animation/review-ali.ts';
import type { SpriteAtlas } from './animation/atlas.ts';
import { InputController } from './ui/input.ts';
import { Screens } from './ui/screens.ts';

let selected: FighterId = 'Ali';
let engine: CombatEngine | null = null, renderer: GameRenderer | null = null;
let paused = false, accumulator = 0, lastTime = 0, statusTime = 0;
const aliReviewEnabled = ['v3', 'v4'].includes(new URLSearchParams(window.location.search).get('aliArtReview') ?? '');
let reviewAliAtlas: SpriteAtlas | null = null;
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
function attachAliArtReview(): void {
  if (!aliReviewEnabled) return;
  const parent = document.querySelector<HTMLElement>('main.fight-page');
  if (!parent) return;
  const panel = document.createElement('section');
  panel.className = 'art-playtest';
  panel.setAttribute('aria-label', 'Ali V3 candidate local playtest');
  const heading = document.createElement('strong');
  heading.textContent = 'REVIEW ONLY — Ali Combo V3/V4 belum disetujui';
  const note = document.createElement('p');
  note.textContent = 'Pilih ali-combat-frames.png dari ZIP V3 atau Repair V4. File hanya diproses di browser. V4 adalah komposit sementara, bukan keyframe final.';
  const file = document.createElement('input');
  file.type = 'file'; file.accept = '.png,image/png';
  file.id = 'ali-v3-local-file';
  file.setAttribute('aria-label', 'Choose local Ali V3 atlas');
  const status = document.createElement('p'); status.id = 'ali-v3-review-status';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.textContent = reviewAliAtlas ? 'V3 terpasang sementara di sesi browser ini.' : 'Menampilkan sprite Ali asli. Belum ada file V3 dimuat.';
  let selectionSerial = 0;
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Kembalikan sprite Ali asli';
  reset.addEventListener('click', () => {
    selectionSerial++;
    reviewAliAtlas = null; renderer?.setAliReviewAtlas(null); file.value = '';
    status.textContent = 'Sprite Ali asli aktif kembali.';
  });
  file.addEventListener('change', async () => {
    const selectedFile = file.files?.[0]; if (!selectedFile) return;
    const requestedRenderer = renderer, serial = ++selectionSerial;
    reviewAliAtlas = null; requestedRenderer?.setAliReviewAtlas(null);
    file.disabled = true; status.textContent = 'Memverifikasi checksum dan menyusun atlas sementara…';
    try {
      const { atlas, edition } = await loadAliForReview(selectedFile);
      // Ignore stale asynchronous imports if the player exited this match.
      if (serial !== selectionSerial || renderer !== requestedRenderer || !requestedRenderer) return;
      reviewAliAtlas = atlas; requestedRenderer.setAliReviewAtlas(atlas);
      status.textContent = edition + ' berhasil dimuat untuk review saja. Coba LIGHT tiga kali; perhatikan Light 3 F4–F5.';
    } catch (error) {
      if (serial === selectionSerial) status.textContent = 'Ditolak: ' + (error instanceof Error ? error.message : String(error));
    } finally { file.disabled = false; }
  });
  panel.append(heading, note, file, reset, status); parent.append(panel);
}

function startMatch(): void {
  leaveMatch(); engine = new CombatEngine(selected);
  const canvas = screens.fight(input); const gameRenderer = new GameRenderer(canvas);
  renderer = gameRenderer;
  void gameRenderer.prepare([engine.state.player.id, engine.state.cpu.id]);
  if (aliReviewEnabled && reviewAliAtlas) gameRenderer.setAliReviewAtlas(reviewAliAtlas);
  resize.observe(canvas); input.setEnabled(true); screens.update(engine.state, paused); statusTime = 0;
  attachAliArtReview();
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
