// Rampas de habitos (Modulo 4): Semilla -> Consolidacion -> Maestria.
// Venus propone la promocion a las 2 semanas y envia una alerta cariñosa tras 7 dias inactivos.
import * as A from '../../game/actions.js';
import { PILLARS, PILLAR_IDS, PHASES, PHASE_ORDER, PROMOTION_DAYS } from '../../game/content.js';
import { habitStats, addDays } from '../../game/rules.js';
import { bar, pillarChip, screenHeader } from '../components.js';
import { esc, openModal, confirmModal } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'shrine';

function habitCard(h, today) {
  const st = habitStats(h, today);
  const idx = PHASE_ORDER.indexOf(h.phase);
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  return `
    <article class="habit panel">
      <div class="row between">
        <div class="row gap"><img class="pixel pillar-icon" src="assets/ui/pillar_${h.pillar}.png" alt=""><div><b>${esc(h.title)}</b><div>${pillarChip(h.pillar)}</div></div></div>
        <button class="btn icon small" data-action="remove" data-id="${h.id}" aria-label="Eliminar hábito">✕</button>
      </div>
      <div class="ramp">
        ${PHASE_ORDER.map((ph, i) => `
          <div class="ramp-step ${i < idx ? 'past' : ''} ${i === idx ? 'now' : ''}">
            <div class="ramp-icon">${PHASES[ph].icon}</div>
            <div class="ramp-name">${PHASES[ph].name}</div>
            <div class="ramp-dose">${esc(h.doses[i])}</div>
          </div>`).join('<div class="ramp-arrow">▶</div>')}
      </div>
      ${st.nextPhase ? bar(Math.min(1, st.daysInPhase / PROMOTION_DAYS), { color: '#9ad35a', label: `${st.daysInPhase}/${PROMOTION_DAYS} días en ${PHASES[h.phase].name} · ${st.doneInPhase} dosis` }) : '<p class="ok small">🌳 Maestría alcanzada. ¡Este hábito ya es parte de ti!</p>'}
      <div class="dots" title="Últimos 14 días">${last14.map((d) => `<span class="dot ${h.doneDates.includes(d) ? 'on' : ''} ${d === today ? 'today' : ''}"></span>`).join('')}</div>
      ${st.inactiveDays >= 7 ? `<p class="small pink">💗 Hace ${st.inactiveDays} días que no lo visitas. Una dosis mínima basta para volver.</p>` : ''}
    </article>`;
}

export function render({ profile: p, today }) {
  return `
    <div class="habits">
      ${screenHeader('Rampas de Hábitos', `Cada hábito crece en 3 fases. Tras ${PROMOTION_DAYS} días, Venus te preguntará si quieres subir de fase.`)}
      <div class="row end"><button class="btn primary" data-action="new">+ Nuevo hábito</button></div>
      <div class="habit-grid">${p.habits.map((h) => habitCard(h, today)).join('')}</div>
    </div>`;
}

function newHabitModal(ctx) {
  const m = openModal(`
    <h2 class="title-sm">Nuevo hábito</h2>
    <label class="field"><span>Nombre</span><input class="h-title" maxlength="40" placeholder="Ej.: Leer"></label>
    <label class="field"><span>Pilar</span><select class="h-pillar">${PILLAR_IDS.map((p) => `<option value="${p}">${PILLARS[p].name}</option>`).join('')}</select></label>
    ${PHASE_ORDER.map((ph, i) => `<label class="field"><span>${PHASES[ph].icon} Dosis en ${PHASES[ph].name}</span><input class="h-dose" data-i="${i}" maxlength="50" placeholder="${['Ej.: 2 páginas', 'Ej.: 10 páginas', 'Ej.: 1 capítulo'][i]}"></label>`).join('')}
    <div class="row end gap"><button class="btn" data-x>Cancelar</button><button class="btn primary" data-ok>Plantar semilla 🌱</button></div>`);
  const el = m.el;
  el.querySelector('[data-x]').addEventListener('click', m.close);
  el.querySelector('[data-ok]').addEventListener('click', () => {
    const title = el.querySelector('.h-title').value.trim();
    const doses = [...el.querySelectorAll('.h-dose')].map((x) => x.value.trim() || x.placeholder.replace('Ej.: ', ''));
    if (!title) { sfx('error'); el.querySelector('.h-title').focus(); return; }
    A.addHabit({ title, pillar: el.querySelector('.h-pillar').value, doses });
    sfx('select');
    m.close();
    ctx.rerender();
  });
}

export const actions = {
  new: (_el, ctx) => newHabitModal(ctx),
  remove: async (el, ctx) => {
    if (await confirmModal('¿Eliminar este hábito? Tu XP ganada se conserva.', { ok: 'Eliminar', danger: true })) {
      A.removeHabit(el.dataset.id);
      ctx.rerender();
    }
  },
};
