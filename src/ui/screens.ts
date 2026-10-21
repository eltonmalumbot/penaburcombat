import { character, createFighter, ROSTER } from '../game/characters.ts';
import type { FighterId, Match } from '../game/types.ts';
import { drawFighter } from '../render/renderer.ts';
import type { InputController } from './input.ts';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
}
function button(text: string, action: () => void, secondary = false): HTMLButtonElement {
  const node = element('button', `button ${secondary ? 'secondary' : 'primary'}`, text);
  node.type = 'button'; node.addEventListener('click', action); return node;
}
interface Actions { menu: () => void; select: () => void; choose: (id: FighterId) => void; start: () => void; pause: () => void }
export class Screens {
  private readonly root: HTMLElement;
  private readonly actions: Actions;
  private status: HTMLDivElement | null = null;
  private announcement: HTMLDivElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  constructor(root: HTMLElement, actions: Actions) { this.root = root; this.actions = actions; }

  private page(): HTMLElement {
    this.status = null; this.announcement = null; this.pauseButton = null;
    const header = element('header', 'top'), logo = element('a', 'logo', 'OFFICE CLASH');
    logo.href = '#'; logo.addEventListener('click', event => { event.preventDefault(); this.actions.menu(); });
    header.append(logo, element('span', 'tag', 'PENABUR COMBAT · INDEPENDENT PROTOTYPE'));
    const page = element('main', 'page');
    this.root.replaceChildren(header, page, element('footer', 'foot', 'INDEPENDENT FICTIONAL PROTOTYPE • NO OFFICIAL AFFILIATION • NO EMPLOYEE PHOTOS'));
    return page;
  }

  menu(): void {
    const page = this.page(), block = element('div', 'landing'), copy = element('div', 'landing-copy');
    copy.append(element('span', 'eyebrow', 'FRIDAY • 16:59 WIB • ORIGINAL OFFICE UNIVERSE'),
      element('h1', 'big-heading', 'LAST MEETING.\nFIRST FIGHT.'),
      element('p', 'description', 'Rapat mendadak. Deadline tak berujung. Hanya satu cara untuk pulang tepat waktu. Duel kantor bergaya anime chibi!'),
      button('START FIGHT ↗', this.actions.select));
    const poster = element('div', 'poster'), canvas = element('canvas', 'poster-canvas');
    canvas.width = 700; canvas.height = 520; canvas.setAttribute('aria-label', 'Original Ali and Elton fighter artwork');
    poster.append(element('div', 'poster-header', 'ALI         ⚡         ELTON'), canvas, element('div', 'poster-footer', '7 FIGHTERS • 1 ARENA • VS CPU'));
    block.append(copy, poster); page.append(block);
    for (const [i, name] of (['Ali', 'Elton'] as const).entries()) {
      const fighter = createFighter(name, i === 0 ? 205 : 492, i === 0 ? 1 : -1); fighter.y = 490;
      drawFighter(canvas.getContext('2d')!, fighter, 1.45);
    }
  }

  select(selected: FighterId): void {
    const page = this.page(); page.append(element('span', 'eyebrow', 'CHOOSE YOUR OFFICE HERO'), element('h2', 'page-title', 'SELECT FIGHTER'));
    const layout = element('div', 'select-layout'), roster = element('div', 'roster');
    for (const fighter of ROSTER) {
      const slot = element('button', `slot${fighter.id === selected ? ' selected' : ''}${fighter.available ? '' : ' locked'}`);
      slot.type = 'button'; slot.disabled = !fighter.available; slot.setAttribute('aria-pressed', String(fighter.id === selected));
      const avatar = element('span', 'avatar', fighter.id[0]); avatar.setAttribute('aria-hidden', 'true');
      slot.append(avatar, element('strong', '', fighter.id.toUpperCase()), element('small', '', fighter.available ? 'READY' : 'COMING SOON'));
      slot.addEventListener('click', () => this.actions.choose(fighter.id)); roster.append(slot);
    }
    const sidebar = element('aside', 'sidebar'), canvas = element('canvas', 'preview'); canvas.width = 480; canvas.height = 430;
    canvas.setAttribute('aria-label', `${selected} original fighter artwork`);
    sidebar.append(canvas, element('h3', '', selected.toUpperCase()), element('p', '', `CURRENT FIGHTER • ${character(selected).title}`), button('FIGHT CPU →', this.actions.start));
    layout.append(roster, sidebar); page.append(layout);
    page.append(element('p', 'note', 'Five character slots are locked. Fighter art consists of original placeholder avatars, not staff likenesses.'));
    const fighter = createFighter(selected, 240, 1); fighter.y = 400; drawFighter(canvas.getContext('2d')!, fighter, 1.5);
  }

  fight(input: InputController): HTMLCanvasElement {
    const page = this.page(), bar = element('div', 'battle-bar');
    this.pauseButton = button('PAUSE / RESUME', this.actions.pause, true); this.pauseButton.setAttribute('aria-pressed', 'false');
    bar.append(element('span', 'eyebrow', 'LIVE MATCH • RUANG RAPAT 16.59'), this.pauseButton, button('EXIT', this.actions.select, true));
    const wrap = element('div', 'game-wrap'), canvas = element('canvas');
    canvas.id = 'game'; canvas.width = 1280; canvas.height = 720; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Fighting arena');
    wrap.append(canvas); page.append(bar, wrap);
    page.append(element('div', 'controls', 'A/D MOVE • W JUMP • S GUARD • J COMBO ×3 • K HEAVY • L SKILL (20) • U ULTIMATE (65) • SHIFT DASH • P PAUSE'));
    const pad = element('div', 'touch-pad');
    for (const key of ['a', 'd', 'w', 's', 'j', 'k', 'l', 'u', 'shift']) {
      const control = element('button', `touch${key === 'u' ? ' super' : ''}`, key === 'shift' ? '»' : key.toUpperCase());
      control.type = 'button'; control.setAttribute('aria-label', `Control ${key}`); input.bind(control, key); pad.append(control);
    }
    this.status = element('div', 'sr-only match-status'); this.status.setAttribute('role', 'group'); this.status.setAttribute('aria-label', 'Match status');
    this.announcement = element('div', 'sr-only'); this.announcement.setAttribute('role', 'status');
    page.append(pad, this.status, this.announcement); canvas.focus({ preventScroll: true }); return canvas;
  }

  update(match: Match, paused: boolean): void {
    if (!this.status) return;
    this.status.textContent = `${match.player.id} health ${match.player.hp}, meter ${Math.floor(match.player.meter)}. ${match.cpu.id} health ${match.cpu.hp}, meter ${Math.floor(match.cpu.meter)}. Round ${match.round}, score ${match.score.join(' to ')}, ${Math.ceil(match.timer)} seconds. ${paused ? 'Paused.' : ''}`;
    this.status.dataset.phase = match.phase; this.status.dataset.round = String(match.round);
    this.status.dataset.playerHealth = String(match.player.hp); this.status.dataset.cpuHealth = String(match.cpu.hp);
    this.status.dataset.playerMeter = String(match.player.meter); this.status.dataset.cpuMeter = String(match.cpu.meter);
    this.status.dataset.timer = String(Math.ceil(match.timer)); this.status.dataset.paused = String(paused);
    if (this.announcement && this.announcement.textContent !== match.notice) this.announcement.textContent = match.notice;
    this.pauseButton?.setAttribute('aria-pressed', String(paused));
  }

  result(match: Match): void {
    const page = this.page(), end = element('div', 'result'), won = match.result === 0, who = won ? match.player.id : match.cpu.id;
    end.append(element('span', 'eyebrow', 'MATCH COMPLETE'), element('div', 'trophy', won ? '★' : '⚡'),
      element('h1', 'big-heading', won ? 'VICTORY!' : 'DEFEAT'), element('p', 'description', `${who.toUpperCase()} WINS • ${match.score[0]} — ${match.score[1]}`),
      button('REMATCH', this.actions.start), button('CHANGE FIGHTER', this.actions.select, true)); page.append(end);
    end.querySelector('button')?.focus({ preventScroll: true });
  }
}
