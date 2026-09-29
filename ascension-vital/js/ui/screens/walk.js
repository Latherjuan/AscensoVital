// Caminata (Modulo 2): varios rivales simultaneos (los boss_templates del pilar 'fisica').
// Segun lo caminado en el dia se vence, al cerrar el dia, el subconjunto de mayor valor posible
// (ver walkDailyBosses/bestWalkCombo en rules.js). El sensor de pasos vive en core/motion.js,
// activo en toda la app mientras la pestaña este abierta (no solo en esta pantalla); cada minuto
// detectado dispara un evento 'av-walk-tick' que esta pantalla anima si esta a la vista, con
// golpe, vibracion y vista previa de a quien vencerias.
import * as A from '../../game/actions.js';
import { STEPS_PER_MINUTE } from '../../game/content.js';
import { walkDailyBosses, bestWalkCombo, bossState, addDays } from '../../game/rules.js';
import { bar, screenHeader } from '../components.js';
import { esc, toast, floatText } from '../fx.js';
import { isStepSensorOn, getSteps, enableStepSensor, disableStepSensor } from '../../core/motion.js';
import { sfx, vibrate } from '../audio.js';

export const background = 'battle';

let lastCtx = null;

function spriteUrl(boss, state) {
  return boss.spriteBaseUrl ? `${boss.spriteBaseUrl}/${state}.png` : `assets/bosses/${boss.id}_${state}.png`;
}

function rivalCard(boss, wouldDefeat) {
  return `
    <div class="rung walk-rival ${wouldDefeat ? 'beaten' : ''}">
      <img class="pixel" src="${spriteUrl(boss, 0)}" alt="${esc(boss.bossName)}" title="${esc(boss.bossName)}">
      <span>${esc(boss.bossName)}</span>
      <span class="muted small">${boss.minutes}′</span>
    </div>`;
}

function reactToWalkHit(ev, bosses) {
  const spriteEl = document.getElementById('walk-arena-sprite');
  if (!spriteEl) return; // no estamos viendo esta pantalla ahora mismo
  const rect = spriteEl.getBoundingClientRect();
  const newlyBeaten = ev?.walkHit?.newlyBeaten ?? [];
  sfx('hit');
  spriteEl.classList.remove('hurt');
  void spriteEl.offsetWidth;
  spriteEl.classList.add('hurt');
  if (newlyBeaten.length) {
    vibrate([120, 60, 120]);
    const names = newlyBeaten.map((id) => bosses.find((b) => b.id === id)?.bossName ?? id).join(', ');
    floatText(`¡Vencerías a ${names}!`, { color: '#ffe66b', x: rect.left + rect.width / 2, y: rect.top, big: true });
  } else {
    vibrate(30);
    floatText(`+${ev?.walkHit?.minutes ?? 1}′`, { color: '#6fe36b', x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 });
  }
}

window.addEventListener('av-walk-tick', (e) => {
  if (!document.getElementById('walk-arena-sprite')) return;
  reactToWalkHit(e.detail, walkDailyBosses());
  setTimeout(() => lastCtx?.rerender(), 500);
});

export function render({ profile: p, today }) {
  const bosses = walkDailyBosses();
  const walked = p.log[today]?.walkMinutes ?? 0;
  const totalToClearAll = bosses.reduce((a, b) => a + b.minutes, 0) || 1;
  const preview = bestWalkCombo(bosses, walked);
  const allBeaten = bosses.length > 0 && preview.ids.length === bosses.length;
  const target = bosses.find((b) => !preview.ids.includes(b.id)) ?? bosses[bosses.length - 1];
  const yesterday = addDays(today, -1);
  const yesterdayLog = p.log[yesterday];
  const sensorOn = isStepSensorOn();

  const arena = target ? (() => {
    const pct = Math.min(1, walked / target.minutes);
    const st = bossState(Math.round(100 * (1 - pct)), 100);
    return `
      <div class="arena">
        <img class="pixel boss-sprite state-${st}" id="walk-arena-sprite" src="${spriteUrl(target, allBeaten ? 4 : st)}" alt="${esc(target.bossName)}">
      </div>
      <div class="boss-name">${esc(target.bossName)} <span class="muted">· ${target.minutes}′</span></div>
      ${bar(1 - pct, { color: pct > 0.5 ? '#f2c84b' : '#6fe36b', label: allBeaten ? '¡Vencerías a todos hoy!' : `${walked}/${target.minutes}′ para este rival`, cls: 'hp' })}`;
  })() : '<p class="muted center">Todavía no hay jefes de Física en el catálogo.</p>';

  return `
    <div class="walk">
      ${screenHeader('Caminata', 'Cada minuto caminado suma. Al cerrar el día, vences al mayor valor posible de rivales.')}

      ${yesterdayLog?.walkDefeated?.length ? `
        <p class="ok center">🏆 Ayer venciste a: <b>${yesterdayLog.walkDefeated.map((id) => esc(bosses.find((b) => b.id === id)?.bossName ?? id)).join(', ')}</b></p>` : ''}

      <article class="battle panel">
        ${arena}
        <p class="center">Hoy caminaste <b>${walked} min</b></p>
        ${bar(Math.min(1, walked / totalToClearAll), { color: '#4aa8ff', label: `${walked}/${totalToClearAll} min para vencerlos a todos`, cls: 'hp' })}
        ${preview.ids.length ? `<p class="ok center small">Con lo caminado hasta ahora, vencerías: <b>${preview.ids.map((id) => esc(bosses.find((b) => b.id === id)?.bossName ?? id)).join(', ')}</b> (se confirma al cerrar el día).</p>` : ''}
        <div class="row center"><button class="btn gold" data-action="testStep">⚔ Simular 1 min caminado</button></div>
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
        <p class="muted">En el móvil, el acelerómetro cuenta pasos mientras la pestaña esté abierta (${STEPS_PER_MINUTE} pasos = 1 min), en cualquier pantalla de la app, no solo aquí. Actívalo una vez y queda recordado. La vibración al vencer un rival no funciona en iPhone (Apple no lo permite en Safari).</p>
        <div class="row gap wrap">
          <button class="btn ${sensorOn ? '' : 'primary'}" data-action="sensor">${sensorOn ? 'Detener sensor' : 'Activar sensor'}</button>
          <span>Pasos en esta sesión: <b id="step-count">${getSteps()}</b></span>
        </div>
        <p class="muted small">¿Sin acelerómetro a mano? Usa "Simular 1 min caminado" arriba, o Dev Controls.</p>
      </section>
    </div>`;
}

export function mount(root, ctx) {
  lastCtx = ctx;
}

async function testStep(ctx) {
  const ev = A.addWalkMinutes(1);
  reactToWalkHit(ev, walkDailyBosses());
  await new Promise((r) => setTimeout(r, 500));
  ctx.rerender();
}

export const actions = {
  testStep: (_el, ctx) => testStep(ctx),
  sensor: async (_el, ctx) => {
    if (isStepSensorOn()) {
      disableStepSensor();
      return ctx.rerender();
    }
    const ok = await enableStepSensor();
    if (ok) { sfx('blip'); toast('Sensor activo. ¡A caminar!'); }
    else toast('Este dispositivo no ofrece acelerómetro. Usa "Simular 1 min caminado" o Dev Controls.');
    ctx.rerender();
  },
};
