// Pantalla de titulo: ranuras de partida (perfiles) estilo RPG clasico.
import * as A from '../../game/actions.js';
import { overall } from '../../game/rules.js';
import { avatarImg } from '../components.js';
import { esc, confirmModal } from '../fx.js';
import { sfx } from '../audio.js';

const SLOTS = 3;

export function render({ state }) {
  const profiles = Object.values(state.profiles).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const slots = Array.from({ length: Math.max(SLOTS, profiles.length + 1) }, (_, i) => profiles[i] ?? null).slice(0, Math.max(SLOTS, profiles.length));
  return `
    <div class="title-screen">
      <div class="logo">
        <img class="pixel logo-lotus" src="assets/ui/lotus_open.png" alt="">
        <h1>ASCENSION<br>VITAL</h1>
        <p class="tagline">Un RPG de autorregulación y crecimiento personal</p>
      </div>
      <div class="slots panel">
        <h2 class="title-sm">Elige tu partida</h2>
        ${slots.map((p, i) => (p ? `
          <div class="slot">
            <div class="slot-avatar">${avatarImg(p, { bust: true })}</div>
            <div class="grow">
              <div class="slot-name">${esc(p.name)}</div>
              <div class="muted">Nivel general ${overall(p).overallLevel} · Racha ${p.streak} 🔥</div>
            </div>
            <button class="btn primary" data-action="play" data-id="${p.id}">Jugar</button>
            <button class="btn icon danger" data-action="delete" data-id="${p.id}" aria-label="Borrar partida">✕</button>
          </div>` : `
          <button class="slot empty" data-action="new">
            <span class="slot-num">Ranura ${i + 1}</span><span>+ Nueva partida</span>
          </button>`)).join('')}
      </div>
      <p class="muted small">Prototipo local · los datos se guardan en este navegador</p>
    </div>`;
}

export const actions = {
  play: (el, ctx) => {
    sfx('select');
    const ev = A.selectProfile(el.dataset.id);
    ctx.go('santuario');
    ctx.play(ev);
  },
  new: (_el, ctx) => { sfx('select'); ctx.go('crear'); },
  delete: async (el, ctx) => {
    const p = ctx.state.profiles[el.dataset.id];
    if (await confirmModal(`¿Borrar la partida de <b>${esc(p.name)}</b>? Esta acción no se puede deshacer.`, { ok: 'Borrar', danger: true })) {
      A.deleteProfile(p.id);
      ctx.rerender();
    }
  },
};
