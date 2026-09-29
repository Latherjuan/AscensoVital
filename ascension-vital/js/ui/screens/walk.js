// Caminata (Modulo 2): varios rivales simultaneos (los boss_templates del pilar 'fisica').
// Segun lo caminado en el dia se vence, al cerrar el dia, el subconjunto de mayor valor posible
// (ver walkDailyBosses/bestWalkCombo en rules.js). El sensor de pasos vive en core/motion.js,
// activo en toda la app mientras la pestaña este abierta (no solo en esta pantalla).
import { STEPS_PER_MINUTE } from '../../game/content.js';
import { walkDailyBosses, bestWalkCombo, addDays } from '../../game/rules.js';
import { bar, screenHeader } from '../components.js';
import { esc, toast } from '../fx.js';
import { isStepSensorOn, getSteps, enableStepSensor, disableStepSensor } from '../../core/motion.js';
import { sfx } from '../audio.js';

export const background = 'battle';

function spriteUrl(tpl, state) {
  return tpl.spriteBaseUrl ? `${tpl.spriteBaseUrl}/${state}.png` : `assets/bosses/${tpl.id}_${state}.png`;
}

function rivalCard(boss, wouldDefeat) {
  return `
    <div class="rung walk-rival ${wouldDefeat ? 'beaten' : ''}">
      <img class="pixel" src="${spriteUrl(boss, 0)}" alt="${esc(boss.bossName)}" title="${esc(boss.bossName)}">
      <span>${esc(boss.bossName)}</span>
      <span class="muted small">${boss.minutes}′</span>
    </div>`;
}

export function render({ profile: p, today }) {
  const bosses = walkDailyBosses();
  const walked = p.log[today]?.walkMinutes ?? 0;
  const totalToClearAll = bosses.reduce((a, b) => a + b.minutes, 0) || 1;
  const preview = bestWalkCombo(bosses, walked);
  const yesterday = addDays(today, -1);
  const yesterdayLog = p.log[yesterday];
  const sensorOn = isStepSensorOn();
  return `
    <div class="walk">
      ${screenHeader('Caminata', 'Cada minuto caminado suma. Al cerrar el día, vences al mayor valor posible de rivales.')}

      ${yesterdayLog?.walkDefeated?.length ? `
        <p class="ok center">🏆 Ayer venciste a: <b>${yesterdayLog.walkDefeated.map((id) => esc(bosses.find((b) => b.id === id)?.bossName ?? id)).join(', ')}</b></p>` : ''}

      <article class="battle panel">
        <div class="boss-name">Hoy caminaste <b>${walked} min</b></div>
        ${bar(Math.min(1, walked / totalToClearAll), { color: '#6fe36b', label: `${walked}/${totalToClearAll} min para vencerlos a todos`, cls: 'hp' })}
        ${preview.ids.length ? `<p class="ok center">Con lo caminado hasta ahora, vencerías: <b>${preview.ids.map((id) => esc(bosses.find((b) => b.id === id)?.bossName ?? id)).join(', ')}</b> (se confirma al cerrar el día).</p>` : '<p class="muted center">Camina un poco más para empezar a vencer rivales hoy.</p>'}
      </article>

      <section class="panel">
        <h2 class="title-sm">Rivales de hoy</h2>
        <div class="ladder">
          ${bosses.map((b) => rivalCard(b, preview.ids.includes(b.id))).join('')}
        </div>
        <p class="muted small">Se reinician todos cada día. Aparecen automáticamente los jefes del pilar Física que haya en el catálogo.</p>
      </section>

      <section class="panel">
        <h2 class="title-sm">Sensor de pasos</h2>
        <p class="muted">En el móvil, el acelerómetro cuenta pasos mientras la pestaña esté abierta (${STEPS_PER_MINUTE} pasos = 1 min), en cualquier pantalla de la app, no solo aquí. Actívalo una vez y queda recordado.</p>
        <div class="row gap wrap">
          <button class="btn ${sensorOn ? '' : 'primary'}" data-action="sensor">${sensorOn ? 'Detener sensor' : 'Activar sensor'}</button>
          <span>Pasos en esta sesión: <b id="step-count">${getSteps()}</b></span>
        </div>
        <p class="muted small">¿Sin móvil a mano? Simula minutos en <a href="#/dev">Dev Controls</a>.</p>
      </section>
    </div>`;
}

export const actions = {
  sensor: async (_el, ctx) => {
    if (isStepSensorOn()) {
      disableStepSensor();
      return ctx.rerender();
    }
    const ok = await enableStepSensor();
    if (ok) { sfx('blip'); toast('Sensor activo. ¡A caminar!'); }
    else toast('Este dispositivo no ofrece acelerómetro. Usa Dev Controls para simular.');
    ctx.rerender();
  },
};
