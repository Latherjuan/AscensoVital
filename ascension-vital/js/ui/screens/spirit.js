// Pilar Consciencia (Modulo 3): meditacion Ho'oponopono con palabra gatillo, pildoras espirituales
// y flujo de autocompasion (Kristin Neff) que otorga el Multiplicador de Humildad.
import * as A from '../../game/actions.js';
import { SPIRIT_PILLS, HOOPONOPONO, TRIGGER_WORD, HUMILITY_CHARGES, MAX_SHIELDS } from '../../game/content.js';
import { screenHeader } from '../components.js';
import { esc, openModal, toast } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'shrine';

const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function render({ profile: p, today }) {
  const log = p.log[today] ?? {};
  const done = log.spiritPills ?? [];
  const meditations = done.filter((x) => x.startsWith('meditacion')).length;
  return `
    <div class="spirit">
      ${screenHeader('Santuario Espiritual', 'Píldoras breves para el pilar de Consciencia & Espiritualidad.')}
      <div class="spirit-grid">
        <section class="panel meditation-card">
          <img class="pixel lotus-hero" src="assets/ui/lotus_open.png" alt="">
          <h2 class="title-sm">Meditación Ho'oponopono</h2>
          <p class="muted">Respira al ritmo del loto y repite: <i>${HOOPONOPONO.join(', ')}</i>. Al final, sella la práctica con la palabra gatillo.</p>
          <div class="row gap wrap center">
            ${[1, 3, 5].map((m) => `<button class="btn primary" data-action="meditate" data-min="${m}">${m} min</button>`).join('')}
          </div>
          ${meditations ? `<p class="small ok">✓ ${meditations} meditación(es) hoy</p>` : ''}
        </section>
        <section class="panel">
          <h2 class="title-sm">Píldoras del día</h2>
          ${SPIRIT_PILLS.map((pill) => `
            <div class="pill ${done.includes(pill.id) ? 'done' : ''}">
              <div class="row between"><b>${pill.title}</b><span class="chip xp">+${pill.xp} XP</span></div>
              <p class="muted">${esc(pill.prompt)}</p>
              ${done.includes(pill.id) ? '<p class="ok small">✓ Completada hoy</p>' : `
                <textarea rows="2" placeholder="(Opcional) Escribe aquí. No se guarda: es solo para ti."></textarea>
                <button class="btn" data-action="pill" data-id="${pill.id}">Completar píldora</button>`}
            </div>`).join('')}
        </section>
        <section class="panel compassion">
          <img class="pixel" src="assets/ui/shield_recharge.png" alt="" width="72">
          <h2 class="title-sm">Autocompasión</h2>
          <p class="muted">¿Un desliz? En Ascensión Vital no hay castigo. Transforma la culpa en cuidado y recibe <b>+25% XP</b> durante ${HUMILITY_CHARGES} misiones y un <b>Escudo de Racha</b>.</p>
          <p class="small">Escudos: ${p.streakShields}/${MAX_SHIELDS} · Humildad: ${p.humilityCharges ? `activa (${p.humilityCharges})` : 'inactiva'}</p>
          <button class="btn primary" data-action="slip">Reportar un desliz con humildad</button>
        </section>
      </div>
    </div>`;
}

function startMeditation(minutes, ctx) {
  const speed = ctx.state.settings.fastTime ? 10 : 1;
  let remaining = minutes * 60;
  let phrase = 0;
  sfx('heal');
  const m = openModal(`
    <div class="meditation-session">
      <img class="pixel lotus-breath" src="assets/ui/lotus_open.png" alt="">
      <div class="breath-cue">Inhala...</div>
      <div class="hoopo">${HOOPONOPONO[0]}</div>
      <div class="timer"></div>
      <div class="seal" hidden>
        <p>Sella tu práctica escribiendo la palabra gatillo:</p>
        <input class="trigger-input" placeholder="Flor de..." autocomplete="off">
        <button class="btn primary" data-seal>Sellar</button>
      </div>
      <button class="btn small" data-cancel>Salir</button>
    </div>`, { className: 'meditation-modal' });
  const el = m.el;
  const timerEl = el.querySelector('.timer');
  const cue = el.querySelector('.breath-cue');
  const hoopo = el.querySelector('.hoopo');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let tick = 0;
  timerEl.textContent = fmt(remaining);
  const interval = setInterval(() => {
    remaining = Math.max(0, remaining - speed);
    tick++;
    timerEl.textContent = fmt(remaining);
    if (tick % 4 === 0) {
      phrase = (phrase + 1) % HOOPONOPONO.length;
      hoopo.textContent = HOOPONOPONO[phrase];
      cue.textContent = (tick / 4) % 2 ? 'Exhala...' : 'Inhala...';
    }
    if (remaining <= 0) {
      clearInterval(interval);
      el.querySelector('.lotus-breath').classList.add('still');
      cue.textContent = 'Práctica completa';
      el.querySelector('.seal').hidden = false;
      el.querySelector('.trigger-input').focus();
      sfx('heal');
    }
  }, 1000);
  const close = () => { clearInterval(interval); m.close(); };
  el.querySelector('[data-cancel]').addEventListener('click', close);
  const seal = async () => {
    const input = el.querySelector('.trigger-input');
    if (normalize(input.value) !== TRIGGER_WORD) {
      sfx('error');
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }
    close();
    const ev = A.completeMeditation(minutes);
    ctx.rerender();
    await ctx.play(ev);
  };
  el.querySelector('[data-seal]').addEventListener('click', seal);
  el.querySelector('.trigger-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') seal(); });
}

/** Flujo en 3 pasos: atencion plena -> humanidad compartida -> bondad con uno mismo. */
export function openSlipFlow(ctx) {
  const steps = [
    { title: '1 · Atención plena', body: `<p>Nombra lo que pasó, sin exagerarlo ni esconderlo. Solo obsérvalo.</p><textarea rows="3" placeholder="Ej.: Hoy no hice ejercicio y comí de más. Me siento frustrada/o."></textarea><p class="muted small">No se guarda: es solo para ti.</p>`, next: 'Lo observo' },
    { title: '2 · Humanidad compartida', body: '<p>Tropezar es parte de ser humano. Hoy, miles de personas sintieron exactamente lo mismo que tú. No estás sola/o en esto.</p><label class="check"><input type="checkbox"> Lo reconozco: equivocarme me hace humano, no un fracaso.</label>', next: 'Continuar', needsCheck: true },
    { title: '3 · Bondad contigo', body: `<p>Háblate como le hablarías a alguien que amas. Repite en silencio:</p><div class="hoopo-list">${HOOPONOPONO.map((h) => `<span>${h}</span>`).join('')}</div>`, next: 'Me lo digo con cariño' },
  ];
  let i = 0;
  const m = openModal('<div class="slip-flow"></div>', { className: 'slip-modal' });
  const box = m.el.querySelector('.slip-flow');
  const show = () => {
    const s = steps[i];
    box.innerHTML = `<h2 class="title-sm">${s.title}</h2>${s.body}<div class="row end gap"><button class="btn" data-x>Cerrar</button><button class="btn primary" data-n>${s.next}</button></div>`;
    box.querySelector('[data-x]').addEventListener('click', m.close);
    box.querySelector('[data-n]').addEventListener('click', () => {
      if (s.needsCheck && !box.querySelector('input[type=checkbox]').checked) { sfx('error'); return; }
      sfx('blip');
      i++;
      if (i < steps.length) return show();
      m.close();
      A.reportSlip();
      sfx('heal');
      toast(`<b>Multiplicador de Humildad</b> activo (+25% XP, ${HUMILITY_CHARGES} misiones) · Escudo recargado · Tu racha está a salvo.`, { icon: 'assets/ui/shield_recharge.png', tone: 'pink' });
      ctx.rerender();
    });
  };
  show();
}

export const actions = {
  meditate: (el, ctx) => startMeditation(Number(el.dataset.min), ctx),
  pill: async (el, ctx) => {
    const ev = A.completeSpiritPill(el.dataset.id);
    ctx.rerender();
    await ctx.play(ev);
  },
  slip: (_el, ctx) => openSlipFlow(ctx),
};
