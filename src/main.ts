import './style.css';
import { CombatEngine, FIXED_STEP } from './game/engine.ts';
import type { FighterId } from './game/types.ts';
import { GameRenderer } from './render/renderer.ts';
import { loadAliForReview } from './animation/review-ali.ts';
import type { AliCandidateEdition } from './animation/review-ali.ts';
import type { SpriteAtlas } from './animation/atlas.ts';
import { InputController } from './ui/input.ts';
import { Screens } from './ui/screens.ts';

let selected: FighterId = 'Ali';
let engine: CombatEngine | null = null, renderer: GameRenderer | null = null;
let paused = false, accumulator = 0, lastTime = 0, statusTime = 0;
let selectedMode: 'vs' | 'practice' = 'vs';
const aliReviewEnabled = ['v3', 'v4', 'v5', 'v51'].includes(new URLSearchParams(window.location.search).get('aliArtReview') ?? '');
let reviewAliAtlas: SpriteAtlas | null = null;
let reviewAliEdition: AliCandidateEdition | null = null;
/** Review-only simulation rate, never applied without the explicit URL opt-in. */
let reviewPlaybackSpeed = 1;
const resize = new ResizeObserver(() => renderer?.resize());
const input = new InputController(togglePause, showSelection, () => setPaused(true));
const root = document.querySelector<HTMLDivElement>('#app')!;
const screens = new Screens(root, { menu: showMenu, select: showSelection,
  choose: id => { selected = id; showSelection(); },
  start: () => { selectedMode = 'vs'; startMatch(); },
  practice: () => { selectedMode = 'practice'; startMatch(); },
  resetPractice: () => { engine?.resetPractice(); input.clear(); accumulator = 0;
    if (engine) screens.update(engine.state, paused); },
  togglePracticeGuard: () => {
    if (engine?.state.mode !== 'practice') return;
    engine.setPracticeDummyGuard(!engine.state.practiceOptions?.dummyGuard);
    screens.update(engine.state, paused);
  },
  togglePracticeMeter: () => {
    if (engine?.state.mode !== 'practice') return;
    engine.setPracticeInfiniteMeter(!engine.state.practiceOptions?.infiniteMeter);
    screens.update(engine.state, paused);
  },
  pause: togglePause });

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
  heading.textContent = 'REVIEW ONLY — Ali Combo V3/V4/V5/V5.1 belum disetujui';
  const note = document.createElement('p');
  note.textContent = 'Pilih ali-combat-frames.png dari ZIP V3, Repair V4, FX Polish V5, atau FX Edge Review V5.1. File hanya diproses di browser; F5 tetap komposit sementara, BUKAN keyframe HD final.';
  const file = document.createElement('input');
  file.type = 'file'; file.accept = '.png,image/png';
  file.id = 'ali-v3-local-file';
  file.setAttribute('aria-label', 'Choose local Ali candidate atlas');
  const status = document.createElement('p'); status.id = 'ali-v3-review-status';
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  status.textContent = reviewAliAtlas ? reviewAliEdition + ' terpasang sementara di sesi browser ini.' : 'Menampilkan sprite Ali asli. Belum ada file V3/V4/V5/V5.1 dimuat.';
  let selectionSerial = 0;
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Kembalikan sprite Ali asli';
  reset.addEventListener('click', () => {
    selectionSerial++;
    reviewAliAtlas = null; reviewAliEdition = null; renderer?.setAliReviewAtlas(null); file.value = '';
    status.textContent = 'Sprite Ali asli aktif kembali.';
  });
  file.addEventListener('change', async () => {
    const selectedFile = file.files?.[0]; if (!selectedFile) return;
    const requestedRenderer = renderer, serial = ++selectionSerial;
    reviewAliAtlas = null; reviewAliEdition = null; requestedRenderer?.setAliReviewAtlas(null);
    file.disabled = true; status.textContent = 'Memverifikasi checksum dan menyusun atlas sementara…';
    try {
      const { atlas, edition } = await loadAliForReview(selectedFile);
      // Ignore stale asynchronous imports if the player exited this match.
      if (serial !== selectionSerial || renderer !== requestedRenderer || !requestedRenderer) return;
      reviewAliAtlas = atlas; reviewAliEdition = edition; requestedRenderer.setAliReviewAtlas(atlas);
      status.textContent = edition + ' berhasil dimuat untuk review saja. Coba LIGHT tiga kali; perhatikan Light 3 F4–F5.';
    } catch (error) {
      if (serial === selectionSerial) status.textContent = 'Ditolak: ' + (error instanceof Error ? error.message : String(error));
    } finally { file.disabled = false; }
  });
  const speed = document.createElement('select');
  speed.id = 'ali-review-speed'; speed.setAttribute('aria-label', 'Review combat speed');
  for (const value of [1, .5, .25]) {
    const option = document.createElement('option');
    option.value = String(value); option.textContent = value + '×'; speed.append(option);
  }
  speed.value = String(reviewPlaybackSpeed);
  speed.addEventListener('change', () => {
    const next = Number(speed.value);
    if (![1, .5, .25].includes(next)) return;
    reviewPlaybackSpeed = next;
    accumulator = 0;
    input.clear();
  });
  const slowLabel = document.createElement('label');
  slowLabel.htmlFor = speed.id; slowLabel.textContent = 'Kecepatan review: ';
  slowLabel.append(speed);

  const capture = document.createElement('button');
  capture.type = 'button'; capture.id = 'ali-review-capture';
  capture.textContent = 'Capture PNG';
  capture.setAttribute('aria-label', 'Capture review game frame');
  capture.addEventListener('click', () => {
    const current = renderer, currentEngine = engine;
    if (!current || !currentEngine) return;
    const canvas = document.querySelector<HTMLCanvasElement>('#game');
    if (!canvas) return;
    capture.disabled = true;
    canvas.toBlob(blob => {
      capture.disabled = false;
      if (!blob || renderer !== current || engine !== currentEngine) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const edition = reviewAliEdition ?? 'original';
      const pose = currentEngine.state.player.id === 'Ali'
        ? currentEngine.state.player.pose : currentEngine.state.cpu.pose;
      link.download = `penabur-ali-${edition}-${pose}-round${currentEngine.state.round}.png`;
      link.href = url; link.click();
      // Revoke after browser has accepted the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
  panel.append(heading, note, file, reset, status, slowLabel, capture); parent.append(panel);
}

function startMatch(): void {
  leaveMatch(); engine = new CombatEngine(selected, { practice: selectedMode === 'practice' });
  const canvas = screens.fight(input, selectedMode === 'practice'); const gameRenderer = new GameRenderer(canvas);
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
      accumulator += dt * (aliReviewEnabled ? reviewPlaybackSpeed : 1);
      while (accumulator + 1e-8 >= FIXED_STEP) {
        engine.update(FIXED_STEP, input.sample());
        accumulator = Math.max(0, accumulator - FIXED_STEP);
      }
      renderer.effects(engine.drainEvents());
    } else input.sample();
    renderer.draw(engine.state, dt * (aliReviewEnabled ? reviewPlaybackSpeed : 1), paused); statusTime += dt;
    if (statusTime >= .1) { screens.update(engine.state, paused); statusTime = 0; }
    if (engine.state.phase === 'done') {
      const result = engine.state; leaveMatch(); screens.result(result);
    }
  } else { accumulator = 0; input.sample(); }
  requestAnimationFrame(tick);
}
showMenu(); requestAnimationFrame(tick);
