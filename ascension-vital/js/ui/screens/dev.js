// Dev Controls: simulan sensores y el paso del tiempo para probar el prototipo.
import * as A from '../../game/actions.js';
import { PILLARS, PILLAR_IDS, STEPS_PER_MINUTE } from '../../game/content.js';
import { screenHeader } from '../components.js';
import { toast, confirmModal } from '../fx.js';

export const background = 'battle';

export function render({ profile: p, today, state }) {
  return `
    <div class="dev">
      ${screenHeader('Dev Controls', 'Herramientas de prueba del prototipo.')}
      <section class="panel">
        <h2 class="title-sm">Tiempo</h2>
        <p>Fecha del juego: <b>${today}</b> ${p.devDayOffset ? `(<span class="pink">+${p.devDayOffset} días simulados</span>)` : ''}</p>
        <div class="row gap wrap">
          <button class="btn" data-action="days" data-n="1">+1 día</button>
          <button class="btn" data-action="days" data-n="7">+7 días</button>
          <button class="btn" data-action="days" data-n="14">+14 días</button>
          <button class="btn" data-action="consistent">+14 días constantes (todos los hábitos)</button>
          <label class="check"><input type="checkbox" data-action="fast" ${state.settings.fastTime ? 'checked' : ''}> Meditación acelerada ×10</label>
        </div>
      </section>
      <section class="panel">
        <h2 class="title-sm">Acelerómetro simulado</h2>
        <p class="muted">Se suman de inmediato a la caminata de hoy; el jefe vencido se resuelve al cerrar el día (+1 día).</p>
        <div class="row gap wrap">
          <button class="btn" data-action="walk" data-min="5">+5 min</button>
          <button class="btn" data-action="walk" data-min="10">+10 min</button>
          <button class="btn" data-action="walk" data-min="30">+30 min</button>
          <button class="btn" data-action="walk" data-min="${Math.round(1000 / STEPS_PER_MINUTE)}">+1000 pasos</button>
        </div>
      </section>
      <section class="panel">
        <h2 class="title-sm">XP por pilar</h2>
        <div class="row gap wrap">${PILLAR_IDS.map((pid) => `<button class="btn" style="border-color:${PILLARS[pid].color}" data-action="xp" data-pillar="${pid}">+100 ${PILLARS[pid].short}</button>`).join('')}</div>
      </section>
      <section class="panel">
        <h2 class="title-sm">Partida</h2>
        <div class="row gap wrap">
          <button class="btn" data-action="tutorial">Repetir tutorial</button>
          <button class="btn danger" data-action="reset">Reiniciar progreso</button>
        </div>
      </section>
    </div>`;
}

export const actions = {
  days: async (el, ctx) => {
    const ev = A.devAdvanceDays(Number(el.dataset.n));
    toast(`Avanzaste ${el.dataset.n} día(s).`);
    ctx.rerender();
    await ctx.play(ev);
  },
  consistent: async (_el, ctx) => {
    const ev = A.devSimulateConsistentDays(14);
    toast('Simulaste 14 días cumpliendo todos tus hábitos.');
    ctx.rerender();
    await ctx.play(ev);
  },
  fast: (el, ctx) => { A.setSetting('fastTime', el.checked); ctx.rerender(); },
  walk: async (el, ctx) => {
    const ev = A.addWalkMinutes(Number(el.dataset.min));
    toast(`+${el.dataset.min} min de caminata hoy.`);
    ctx.rerender();
    await ctx.play(ev);
  },
  xp: async (el, ctx) => { const rect = el.getBoundingClientRect(); const ev = A.devAddXp(el.dataset.pillar, 100); ctx.rerender(); await ctx.play(ev, rect); },
  tutorial: (_el, ctx) => { A.restartTutorial(); ctx.go('santuario'); },
  reset: async (_el, ctx) => {
    if (await confirmModal('¿Reiniciar todo el progreso de esta partida? (Se conserva nombre y avatar)', { ok: 'Reiniciar', danger: true })) {
      A.devReset();
      ctx.go('santuario');
    }
  },
};
