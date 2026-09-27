// Misiones diarias: los habitos del jugador en su dosis de fase actual + mision tutorial.
import * as A from '../../game/actions.js';
import { PILLARS, PHASES, TUTORIAL_MISSION, HUMILITY_BONUS } from '../../game/content.js';
import { habitDose } from '../../game/rules.js';
import { pillarChip, screenHeader } from '../components.js';
import { esc } from '../fx.js';
import { openSlipFlow } from './spirit.js';

export const background = 'kitchen';

function card({ id, title, dose, pillar, xp, done, phase, action, tut = false }) {
  return `
    <div class="mission ${done ? 'done' : ''} ${tut ? 'tutorial-mission' : ''}" ${tut ? 'data-tut="tutorial-mission"' : ''}>
      <img class="pixel pillar-icon" src="assets/ui/pillar_${pillar}.png" alt="">
      <div class="grow">
        <div class="mission-title">${esc(title)}</div>
        <div class="muted">${esc(dose)}</div>
        <div class="row gap wrap">${pillarChip(pillar)}${phase ? `<span class="chip phase">${PHASES[phase].icon} ${PHASES[phase].name}</span>` : ''}<span class="chip xp">+${xp} XP</span></div>
      </div>
      ${done ? '<span class="done-mark">✓</span>' : `<button class="btn primary" data-action="${action}" data-id="${id}">¡Hecho!</button>`}
    </div>`;
}

export function render({ profile: p, today }) {
  const tutorialPending = !p.tutorial.done && !p.inventory.includes('tunica_novicio');
  const humble = p.humilityCharges > 0;
  const sorted = [...p.habits].sort((a, b) => Number(a.doneDates.includes(today)) - Number(b.doneDates.includes(today)));
  return `
    <div class="missions">
      ${screenHeader('Misiones del día', 'Pequeñas dosis diarias. Cada una alimenta un pilar.')}
      ${humble ? `<div class="banner humble"><img class="pixel mini" src="assets/ui/lotus.png" alt=""> Multiplicador de Humildad activo: +${HUMILITY_BONUS * 100}% XP en tus próximas ${p.humilityCharges} misiones.</div>` : ''}
      <div class="panel list">
        ${tutorialPending ? card({ ...TUTORIAL_MISSION, dose: 'Misión Tier 0 · tu primer paso', done: false, action: 'tutorial', tut: true }) : ''}
        ${sorted.map((h) => card({
          id: h.id, title: h.title, dose: habitDose(h), pillar: h.pillar, phase: h.phase,
          xp: Math.round(PHASES[h.phase].xp * (humble ? 1 + HUMILITY_BONUS : 1)), done: h.doneDates.includes(today), action: 'complete',
        })).join('')}
      </div>
      <div class="panel slip-panel">
        <div class="grow">
          <b>¿Tuviste un desliz hoy?</b>
          <p class="muted">Reportarlo con autocompasión no resta XP ni rompe tu racha. Te da el Multiplicador de Humildad y recarga un escudo.</p>
        </div>
        <button class="btn" data-action="slip">Reportar con humildad</button>
      </div>
      <p class="muted small">Edita dosis y fases en <a href="#/habitos">Hábitos</a>. Colores de pilar: ${Object.values(PILLARS).map((x) => `<span style="color:${x.color}">■</span>`).join(' ')}</p>
    </div>`;
}

export const actions = {
  complete: async (el, ctx) => {
    const rect = el.getBoundingClientRect();
    const ev = A.completeHabit(el.dataset.id);
    ctx.rerender();
    await ctx.play(ev, rect);
  },
  tutorial: async (el, ctx) => {
    const rect = el.getBoundingClientRect();
    const ev = A.completeTutorialMission();
    ctx.rerender();
    await ctx.play(ev, rect);
    ctx.tutorialEvent('mission-done');
  },
  slip: (_el, ctx) => openSlipFlow(ctx),
};
