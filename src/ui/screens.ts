import { character, createFighter, ROSTER } from '../game/characters.ts';
import type { FighterId, Match } from '../game/types.ts';
import { drawPortraits } from '../render/renderer.ts';
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
  private fullscreenButton: HTMLButtonElement | null = null;
  constructor(root: HTMLElement, actions: Actions) {
    this.root = root; this.actions = actions;
    document.addEventListener('fullscreenchange', () => {
      this.fullscreenButton?.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    });
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
      // Orientation lock is best-effort; Safari and some Android browsers disallow it.
      try { await screen.orientation?.lock?.('landscape'); }
      catch { /* Players can rotate their phone manually. */ }
    } catch {
      if (this.announcement) this.announcement.textContent =
        'Layar penuh tidak didukung browser ini. Putar HP ke landscape untuk bermain.';
    }
  }

  private page(): HTMLElement {
    this.status = null; this.announcement = null; this.pauseButton = null; this.fullscreenButton = null;
    // Leaving a match always returns to the regular browser layout.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    const header = element('header', 'top'), logo = element('a', 'logo', 'PENABUR Combat');
    logo.href = '#'; logo.addEventListener('click', event => { event.preventDefault(); this.actions.menu(); });
    header.append(logo, element('span', 'tag', '16.59 — Fight for Friday!'));
    const page = element('main', 'page');
    this.root.classList.remove('in-fight');
    this.root.replaceChildren(header, page, element('footer', 'foot', 'PROYEK INDEPENDEN & FIKSI • BUKAN PRODUK RESMI BPK PENABUR • NO OFFICIAL AFFILIATION'));
    return page;
  }

  menu(): void {
    const page = this.page(), block = element('div', 'landing'), copy = element('div', 'landing-copy');
    copy.append(element('span', 'eyebrow', '16.59 — Fight for Friday!'),
      element('h1', 'big-heading', 'PENABUR\nCombat'),
      element('p', 'description', 'Rapat terakhir. Duel pertama. Ali dan Elton berhadapan dalam pertarungan kantor bergaya anime HD chibi. Kuasai combo, kumpulkan meter, lalu lepaskan ultimate.'),
      button('START FIGHT', this.actions.select));
    const poster = element('div', 'poster'), canvas = element('canvas', 'poster-canvas');
    canvas.width = 700; canvas.height = 520; canvas.setAttribute('aria-label', 'Ali and Elton HD fighter artwork');
    poster.append(element('div', 'poster-header', 'ALI         ⚡         ELTON'), canvas, element('div', 'poster-footer', '7 FIGHTERS • 1 ARENA • VS CPU'));
    block.append(copy, poster); page.append(block);
    const portraits = (['Ali', 'Elton'] as const).map((name, i) => {
      const fighter = createFighter(name, i === 0 ? 205 : 492, i === 0 ? 1 : -1); fighter.y = 490;
      return { fighter, scale: 1.45 };
    });
    void drawPortraits(canvas, portraits);
  }

  select(selected: FighterId): void {
    const page = this.page(); page.append(element('span', 'eyebrow', 'CHOOSE YOUR OFFICE HERO'), element('h2', 'page-title', 'SELECT FIGHTER'));
    const layout = element('div', 'select-layout'), roster = element('div', 'roster');
    for (const fighter of ROSTER) {
      const slot = element('button', `slot${fighter.id === selected ? ' selected' : ''}${fighter.available ? '' : ' locked'}`);
      slot.type = 'button'; slot.disabled = !fighter.available; slot.setAttribute('aria-pressed', String(fighter.id === selected));
      slot.dataset.fighter = fighter.id;
      const avatar = element('span', 'avatar', fighter.id[0]); avatar.setAttribute('aria-hidden', 'true');
      if (fighter.available) {
        avatar.textContent = ''; const portrait = element('canvas'); portrait.width = 180; portrait.height = 220;
        const person = createFighter(fighter.id, 90, 1); person.y = 218;
        avatar.append(portrait); void drawPortraits(portrait, [{ fighter: person, scale: .7 }]);
      }
      slot.append(avatar, element('strong', '', fighter.id.toUpperCase()), element('small', '', fighter.available ? 'READY' : 'COMING SOON'));
      slot.addEventListener('click', () => this.actions.choose(fighter.id)); roster.append(slot);
    }
    const sidebar = element('aside', 'sidebar'), canvas = element('canvas', 'preview'); canvas.width = 480; canvas.height = 430;
    canvas.setAttribute('aria-label', `${selected} HD fighter artwork`);
    sidebar.dataset.fighter = selected;
    sidebar.append(canvas, element('span', 'eyebrow', 'HD CHIBI • VS CPU'), element('h3', '', selected.toUpperCase()), element('p', '', character(selected).title),
      element('p', 'ultimate-name', character(selected).ultimateName ?? ''), button('FIGHT CPU →', this.actions.start));
    layout.append(roster, sidebar); page.append(layout);
    page.append(element('p', 'note', 'Ali & Elton playable • Lima petarung lain segera hadir. Animasi pertarungan masih menggunakan gaya prototipe.'));
    const fighter = createFighter(selected, 240, 1); fighter.y = 400; void drawPortraits(canvas, [{ fighter, scale: 1.2 }]);
  }

  fight(input: InputController): HTMLCanvasElement {
    const page = this.page(), bar = element('div', 'battle-bar');
    this.pauseButton = button('PAUSE / RESUME', this.actions.pause, true); this.pauseButton.setAttribute('aria-pressed', 'false');
    bar.append(element('span', 'eyebrow', 'PENABUR Combat • LIVE MATCH • 16.59'));
    if (document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function') {
      this.fullscreenButton = button('FULL SCREEN', () => { void this.toggleFullscreen(); }, true);
      this.fullscreenButton.classList.add('fullscreen-toggle');
      this.fullscreenButton.setAttribute('aria-pressed', 'false');
      bar.append(this.fullscreenButton);
    }
    bar.append(this.pauseButton, button('EXIT', this.actions.select, true));
    const wrap = element('div', 'game-wrap'), canvas = element('canvas');
    canvas.id = 'game'; canvas.width = 1280; canvas.height = 720; canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Fighting arena');
    wrap.append(canvas);
    const layout = element('div', 'fight-layout');
    layout.append(wrap);
    page.classList.add('fight-page');
    this.root.classList.add('in-fight');
    page.append(bar, layout);

    // Keep the original InputController bindings; only their visual arrangement changes.
    // All controls are real buttons, so keyboard and touch can coexist.
    const pad = element('section', 'touch-pad gamepad');
    pad.setAttribute('aria-label', 'On-screen combat controls');
    const groups: readonly { title: string; className: string; keys: readonly [string, string, string][] }[] = [
      { title: 'MOVEMENT', className: 'move', keys: [
        ['a', '◀', 'LEFT'], ['d', '▶', 'RIGHT'], ['w', '↑', 'JUMP'],
        ['s', '↓', 'GUARD'], ['shift', '»', 'DASH'],
      ] },
      { title: 'ATTACK', className: 'attack', keys: [
        ['j', '●', 'LIGHT'], ['k', '●', 'HEAVY'],
        ['l', '●', 'SKILL'], ['u', '★', 'ULTIMATE'],
      ] },
    ];
    for (const group of groups) {
      const section = element('div', `touch-group ${group.className}`);
      section.append(element('span', 'touch-heading', group.title));
      const buttons = element('div', 'touch-buttons');
      for (const [key, glyph, label] of group.keys) {
        const control = element('button', `touch touch-${key}${key === 'u' ? ' super' : ''}`);
        control.type = 'button';
        control.setAttribute('aria-label', `Control ${key}`);
        control.dataset.key = key;
        const icon = element('span', 'touch-glyph', glyph);
        icon.setAttribute('aria-hidden', 'true');
        control.append(icon, element('span', 'touch-label', label));
        input.bind(control, key);
        buttons.append(control);
      }
      section.append(buttons); pad.append(section);
    }
    layout.append(pad);
    page.append(element('p', 'rotate-hint', 'Putar HP ke landscape untuk area bermain yang lebih luas.'));
    this.status = element('div', 'sr-only match-status'); this.status.setAttribute('role', 'group'); this.status.setAttribute('aria-label', 'Match status');
    this.announcement = element('div', 'sr-only'); this.announcement.setAttribute('role', 'status');
    page.append(element('div', 'controls', 'KEYBOARD: A/D MOVE • W JUMP • S GUARD • SHIFT DASH • J LIGHT • K HEAVY • L SKILL • U ULTIMATE • P PAUSE'), this.status, this.announcement);
    canvas.focus({ preventScroll: true }); return canvas;
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
    end.append(element('span', 'eyebrow', 'PENABUR Combat • 16.59 — Fight for Friday!'), element('div', 'trophy', won ? '★' : '⚡'),
      element('h1', 'big-heading', won ? 'VICTORY!' : 'DEFEAT'), element('p', 'description', `${who.toUpperCase()} WINS • ${match.score[0]} — ${match.score[1]}`),
      button('REMATCH', this.actions.start), button('CHANGE FIGHTER', this.actions.select, true)); page.append(end);
    end.querySelector('button')?.focus({ preventScroll: true });
  }
}
