// Caminata progresiva (Modulo 2): 10 jefes diarios de 10 a 60 min. Los minutos acumulados
// (sensor o Dev Controls) se aplican como rafaga de golpes diferida al abrir la pantalla.
import * as A from '../../game/actions.js';
import { WALK_BOSSES, STEPS_PER_MINUTE } from '../../game/content.js';
import { walkBoss } from '../../game/rules.js';
import { bar, screenHeader } from '../components.js';
import { floatText, toast } from '../fx.js';
import { sfx } from '../audio.js';

export const background = 'battle';

let bursting = false;
let sensorOn = false;
let steps = 0;

function golemState(pct) {
  if (pct >= 1) return 4;
  if (pct >= 0.75) return 3;
  if (pct >= 0.5) return 2;
  if (pct >= 0.25) return 1;
  return 0;
}

function golemImg(boss, state, cls, id = '') {
  return `<img class="pixel ${cls}" ${id ? `id="${id}"` : ''} style="filter:${boss.filter};transform:scale(${boss.scale});transform-origin:bottom center" src="assets/bosses/titan_${state}.png" alt="${boss.name}">`;
}

/** Tras vencer al golem del dia, se presenta al siguiente rival de la escalera. */
function nextRival(p) {
  const done = p.walk.defeatedLevel === WALK_BOSSES.length && p.walk.level === WALK_BOSSES.length;
  if (done) return '<p class="ok center">✓ ¡Venciste al Titán Ancestral! Cada día puedes volver a desafiarlo.</p>';
  const next = WALK_BOSSES[Math.min(p.walk.level, WALK_BOSSES.length) - 1];
  return `
    <div class="next-rival">
      ${golemImg(next, 0, 'next-golem')}
      <div><p class="ok">✓ ¡Gólem vencido!</p><p>Próximo rival (mañana): <b>${next.name}</b> · ${next.minutes} min</p></div>
    </div>`;
}

export function render({ profile: p, today }) {
  const boss = walkBoss(p);
  const walked = p.log[today]?.walkMinutes ?? 0;
  const defeated = p.walk.defeatedOn === today;
  const shownBoss = defeated ? WALK_BOSSES[(p.walk.defeatedLevel ?? p.walk.level) - 1] : boss;
  const pct = defeated ? 1 : Math.min(1, walked / boss.minutes);
  return `
    <div class="walk">
      ${screenHeader('Caminata Progresiva', 'Cada minuto caminado es un golpe al gólem del día.')}
      <article class="battle panel">
        <div class="arena">
          ${golemImg(shownBoss, golemState(pct), 'boss-sprite walk-golem', 'walk-golem')}
        </div>
        <div class="boss-name">${shownBoss.name} <span class="muted">· ${shownBoss.minutes} min</span></div>
        ${bar(1 - pct, { color: '#6fe36b', label: defeated ? '¡Vencido hoy!' : `Faltan ${Math.max(0, boss.minutes - walked)} min`, cls: 'hp' })}
        <p class="center">Hoy: <b>${walked} min</b> caminados${p.walk.pendingMinutes ? ` · <span class="badge">+${p.walk.pendingMinutes} min por aplicar</span>` : ''}</p>
        ${defeated ? nextRival(p) : ''}
        ${p.walk.pendingMinutes ? '<div class="row center"><button class="btn gold" data-action="burst">⚔ Desatar ráfaga</button></div>' : ''}
      </article>

      <section class="panel">
        <h2 class="title-sm">Sensor de pasos</h2>
        <p class="muted">En el móvil, el acelerómetro cuenta pasos mientras la app está abierta (${STEPS_PER_MINUTE} pasos = 1 min). La detección en segundo plano llegará con la versión instalable.</p>
        <div class="row gap wrap">
          <button class="btn ${sensorOn ? '' : 'primary'}" data-action="sensor">${sensorOn ? 'Detener sensor' : 'Activar sensor'}</button>
          <span>Pasos en esta sesión: <b id="step-count">${steps}</b></span>
        </div>
        <p class="muted small">¿Sin móvil a mano? Simula minutos en <a href="#/dev">Dev Controls</a>.</p>
      </section>

      <section class="panel">
        <h2 class="title-sm">Escalera de gólems</h2>
        <div class="ladder">
          ${WALK_BOSSES.map((b) => `
            <div class="rung ${b.level < p.walk.level ? 'beaten' : ''} ${b.level === p.walk.level ? 'current' : ''}">
              <img class="pixel" style="filter:${b.level > p.walk.level ? 'brightness(0.15)' : b.filter}" src="assets/bosses/titan_${b.level < p.walk.level ? 4 : 0}.png" alt="${b.name}" title="${b.name}">
              <span>${b.minutes}′</span>
            </div>`).join('')}
        </div>
      </section>
    </div>`;
}

export function mount(root, ctx) {
  if (ctx.profile.walk.pendingMinutes > 0 && !bursting) setTimeout(() => burst(ctx), 500);
}

async function burst(ctx) {
  if (bursting || !ctx.profile.walk.pendingMinutes) return;
  bursting = true;
  const golem = document.getElementById('walk-golem');
  const minutes = ctx.profile.walk.pendingMinutes;
  toast(`Caminaste <b>${minutes} min</b> mientras no estabas. ¡Ráfaga de golpes!`);
  const hits = Math.min(minutes, 12);
  for (let i = 0; i < hits; i++) {
    if (!golem.isConnected) break;
    const r = golem.getBoundingClientRect();
    sfx('hit');
    golem.classList.remove('hurt');
    void golem.offsetWidth;
    golem.classList.add('hurt');
    const perHit = Math.round(minutes / hits);
    floatText(`-${perHit}′`, { color: '#ff5a4a', x: r.left + r.width * (0.3 + Math.random() * 0.4), y: r.top + r.height * (0.2 + Math.random() * 0.4) });
    await new Promise((res) => setTimeout(res, 140));
  }
  const ev = A.applyPendingWalk();
  bursting = false;
  ctx.rerender();
  await ctx.play(ev);
}

// --- Deteccion de pasos simple por picos de aceleracion ---
let below = true;
let lastStep = 0;
function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;
  const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2);
  const now = performance.now();
  if (below && mag > 11.8 && now - lastStep > 280) {
    below = false;
    lastStep = now;
    steps++;
    const el = document.getElementById('step-count');
    if (el) el.textContent = steps;
    if (steps % STEPS_PER_MINUTE === 0) A.addWalkMinutes(1);
  } else if (mag < 10.2) {
    below = true;
  }
}

export const actions = {
  burst: (_el, ctx) => burst(ctx),
  sensor: async (_el, ctx) => {
    if (sensorOn) {
      window.removeEventListener('devicemotion', onMotion);
      sensorOn = false;
      return ctx.rerender();
    }
    try {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res !== 'granted') throw new Error('denied');
      }
      if (typeof DeviceMotionEvent === 'undefined') throw new Error('unsupported');
      window.addEventListener('devicemotion', onMotion);
      sensorOn = true;
      toast('Sensor activo. ¡A caminar!');
    } catch {
      toast('Este dispositivo no ofrece acelerómetro. Usa Dev Controls para simular.');
    }
    ctx.rerender();
  },
};
