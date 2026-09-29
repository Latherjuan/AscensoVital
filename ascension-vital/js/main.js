// Punto de entrada: store + repositorio, router por hash, shell con menu lateral,
// tutorial guiado de Venus (Modulo 0) y buzon de mensajes de Venus.
import { createStore } from './core/store.js';
import { LocalRepository } from './core/repository.js';
import * as A from './game/actions.js';
import { today, overall } from './game/rules.js';
import { avatarImg } from './ui/components.js';
import { preloadAvatar } from './ui/avatar.js';
import { loadBossTemplates } from './game/bossCatalog.js';
import { enableStepSensor } from './core/motion.js';
import { CLOUD_ENABLED } from './config.js';
import * as cloud from './core/cloud.js';
import * as login from './ui/screens/login.js';
import { venusSay, isVenusBusy, playEvents, esc, openModal, toast } from './ui/fx.js';
import { sfx, setSoundEnabled, setMusic } from './ui/audio.js';

import * as title from './ui/screens/title.js';
import * as create from './ui/screens/create.js';
import * as sanctuary from './ui/screens/sanctuary.js';
import * as missions from './ui/screens/missions.js';
import * as bosses from './ui/screens/bosses.js';
import * as walk from './ui/screens/walk.js';
import * as spirit from './ui/screens/spirit.js';
import * as social from './ui/screens/social.js';
import * as habits from './ui/screens/habits.js';
import * as equipment from './ui/screens/equipment.js';
import * as dev from './ui/screens/dev.js';

const store = createStore(A.initialState(), new LocalRepository());
A.bindStore(store);

const NAV = [
  { route: 'santuario', label: 'Santuario', icon: 'assets/ui/pillar_consciencia.png', screen: sanctuary },
  { route: 'misiones', label: 'Misiones', icon: 'assets/ui/chest_closed.png', screen: missions },
  { route: 'jefes', label: 'Jefes', icon: 'assets/bosses/dragon_0.png', screen: bosses },
  { route: 'caminata', label: 'Caminata', icon: 'assets/equipment/boots_t2.png', screen: walk },
  { route: 'espiritu', label: 'Espíritu', icon: 'assets/ui/lotus.png', screen: spirit },
  { route: 'social', label: 'Social', icon: 'assets/ui/pillar_social.png', screen: social },
  { route: 'habitos', label: 'Hábitos', icon: 'assets/ui/pillar_fisiologica.png', screen: habits },
  { route: 'equipo', label: 'Equipo', icon: 'assets/equipment/weapon_t2.png', screen: equipment },
  { route: 'perfil', label: 'Perfil', icon: null, screen: create },
  { route: 'dev', label: 'Dev Controls', icon: 'assets/equipment/helm_t3.png', screen: dev },
];
const STANDALONE = { inicio: title, crear: create };

const app = document.getElementById('app');
let current = null;
let menuOpen = false;
let session = null; // sesion de Supabase (solo en modo nube)

const route = () => location.hash.replace(/^#\/?/, '') || 'inicio';

function ctx() {
  const state = store.getState();
  const profile = state.profiles[state.activeProfileId] ?? null;
  return {
    state,
    profile,
    today: profile ? today(profile) : null,
    go,
    rerender: render,
    play: (ev, anchor) => playEvents(ev, anchor),
    tutorialEvent,
    onSession: startWithSession,
  };
}

function go(r) {
  if (route() === r) render();
  else location.hash = `#/${r}`;
}

// ---------- Render ----------
function render() {
  if (CLOUD_ENABLED && !session) {
    current = login;
    document.body.className = 'standalone';
    app.innerHTML = `<main class="stage solo" style="${bgStyle('sanctuary')}"><div class="screen">${login.render()}</div></main>`;
    login.mount(app.querySelector('.screen'), ctx(), startWithSession);
    return;
  }
  let state = store.getState();
  let profile = state.profiles[state.activeProfileId];
  let r = route();

  if (!profile && !STANDALONE[r]) { history.replaceState(null, '', '#/inicio'); r = 'inicio'; }
  if (profile && r === 'crear') { history.replaceState(null, '', '#/santuario'); r = 'santuario'; }
  if (profile && profile.lastProcessedDate < today(profile)) {
    const ev = A.processDay();
    playEvents(ev);
    state = store.getState();
    profile = state.profiles[state.activeProfileId];
  }

  const c = ctx();
  if (STANDALONE[r]) {
    current = STANDALONE[r];
    document.body.className = 'standalone';
    app.innerHTML = `<main class="stage solo" style="${bgStyle('sanctuary')}"><div class="screen">${current.render(c)}</div></main>`;
  } else {
    const nav = NAV.find((n) => n.route === r) ?? NAV[0];
    current = nav.screen;
    document.body.className = '';
    app.innerHTML = shell(c, nav);
  }
  current.mount?.(app.querySelector('.screen'), c);
  applyTutorialLock(c);
  queueMicrotask(afterRender);
}

const bgStyle = (name) => `background-image:linear-gradient(180deg,rgba(8,6,24,.55),rgba(8,6,24,.82)),url(assets/bg/${name}.webp)`;

function shell(c, nav) {
  const p = c.profile;
  const o = overall(p);
  return `
    <div class="app-shell ${menuOpen ? 'menu-open' : ''}">
      <aside class="sidebar panel" id="sidebar">
        <div class="side-profile">
          ${avatarImg(p, { cls: 'side-avatar', bust: true })}
          <div>
            <div class="side-name">${esc(p.name)}</div>
            <div class="side-level">NV ${o.overallLevel} · 🔥${p.streak}</div>
          </div>
        </div>
        <nav>
          ${NAV.map((n) => `
            <a href="#/${n.route}" class="nav-item ${n === nav ? 'active' : ''}" data-tut="nav-${n.route}">
              ${n.icon ? `<img class="pixel" src="${n.icon}" alt="">` : avatarImg(p, { cls: 'nav-avatar', withGear: false, bust: true })}
              <span>${n.label}</span>
            </a>`).join('')}
        </nav>
        <div class="side-foot">
          <button class="btn small" data-action="sound">${c.state.settings.sound ? '🔊' : '🔇'} Sonido</button>
          <button class="btn small" data-action="music">${c.state.settings.music ? '🎵 On' : '🎵 Off'}</button>
          <button class="btn small" data-action="logout">⏏ Partidas</button>
          ${CLOUD_ENABLED ? '<button class="btn small" data-action="signout">Cerrar sesión</button>' : ''}
        </div>
      </aside>
      <div class="scrim" data-action="toggle-menu"></div>
      <main class="stage" style="${bgStyle(nav.screen.background ?? 'sanctuary')}">
        <div class="topbar">
          <button class="btn icon menu-btn" data-action="toggle-menu" aria-label="Menú">☰</button>
          <span class="topbar-title">${nav.label}</span>
          <span class="topbar-level">NV ${o.overallLevel}</span>
        </div>
        <div class="screen">${nav.screen.render(c)}</div>
      </main>
    </div>`;
}

// ---------- Acciones globales y delegacion ----------
const GLOBAL = {
  'toggle-menu': () => { menuOpen = !menuOpen; document.querySelector('.app-shell')?.classList.toggle('menu-open', menuOpen); },
  sound: (_el, c) => { A.setSetting('sound', !c.state.settings.sound); setSoundEnabled(!c.state.settings.sound); render(); },
  music: (_el, c) => { A.setSetting('music', !c.state.settings.music); setMusic(!c.state.settings.music); render(); },
  logout: () => { A.logout(); setMusic(false); go('inicio'); },
  signout: async () => {
    await store.flush();
    await cloud.signOut();
    location.reload();
  },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && app.contains(el)) {
    const fn = current?.actions?.[el.dataset.action] ?? GLOBAL[el.dataset.action];
    if (fn) {
      if (el.tagName !== 'INPUT') e.preventDefault();
      fn(el, ctx());
    }
    return;
  }
  if (e.target.closest('.nav-item')) { sfx('blip'); menuOpen = false; }
});
window.addEventListener('hashchange', render);

// ---------- Tutorial: "El Despertar de Venus" ----------
const TUT_TARGET = { 2: 'nav-misiones', 4: 'tutorial-mission' };
const TUT_HINT = { 2: 'Toca «Misiones» en el menú', 4: 'Haz 5 estiramientos y toca «¡Hecho!»' };
let tutRunning = false;
const modalOpen = () => !!document.querySelector('#modal-layer .modal-wrap');

function applyTutorialLock(c) {
  const p = c.profile;
  const step = p && !p.tutorial.done ? p.tutorial.step : null;
  const target = TUT_TARGET[step];
  document.body.classList.toggle('tut-lock', !!target);
  document.getElementById('tut-hint').hidden = !target;
  if (!target) return;
  const el = document.querySelector(`[data-tut="${target}"]`);
  el?.classList.add('tut-target');
  document.querySelector('#tut-hint .tut-text').textContent = TUT_HINT[step];
  if (step === 2 && window.matchMedia('(max-width: 860px)').matches) {
    menuOpen = true;
    document.querySelector('.app-shell')?.classList.add('menu-open');
  }
}

async function runTutorial() {
  const c = ctx();
  const p = c.profile;
  if (!p || p.tutorial.done || tutRunning || isVenusBusy() || modalOpen()) return;
  const step = p.tutorial.step;
  const r = route();
  const say = async (lines, next) => {
    tutRunning = true;
    await venusSay(lines);
    tutRunning = false;
    A.setTutorialStep(next);
    render();
  };
  if (step <= 1 && r !== 'santuario') return go('santuario');
  if ((step === 3 || step === 4) && r !== 'misiones') return go('misiones');
  if (step === 2 && r === 'misiones') { A.setTutorialStep(3); return render(); }

  if (step === 0) {
    return say([
      `Bienvenido/a, ${p.name}. Soy Venus, y te acompañaré en tu Ascensión Vital.`,
      'Aquí no se trata de ser perfecto. Se trata de cuidarte un poco cada día, con amor y constancia.',
      'Este es tu Santuario Central. Sobre el pedestal está tu avatar: crecerá contigo.',
    ], 1);
  }
  if (step === 1) {
    document.querySelector('[data-tut="hexagon"]')?.classList.add('tut-glow');
    return say([
      'Tu vida se sostiene sobre 6 pilares: Física, Fisiológica, Social, Autoestima, Consciencia y Prosperidad.',
      'Tu Nivel General es el de tu pilar MÁS DÉBIL, más un Bono de Armonía si los mantienes equilibrados.',
      'Así evitamos la productividad obsesiva a costa de tu salud o tus vínculos. Crecer es crecer completo.',
      'Empecemos con algo pequeño. Ve a tus Misiones.',
    ], 2);
  }
  if (step === 3) {
    return say([
      'Estas son tus misiones del día. Cada una alimenta un pilar con experiencia (XP).',
      'Tu primera misión es sencilla: haz 5 estiramientos ahora mismo. Levántate, estira brazos, cuello y espalda.',
      'Cuando termines, toca «¡Hecho!». Yo te espero. 💗',
    ], 4);
  }
  if (step === 5) {
    tutRunning = true;
    await venusSay([
      '¡Lo lograste! Esa Túnica del Novicio es tuya: la llevarás desde hoy.',
      'Cada pilar forja una pieza de equipo: botas, armadura, morral, escudo, casco y arma. Suben de tier al subir el pilar.',
      'Y recuerda: si un día tropiezas, no te castigues. Repórtalo con humildad y recibirás un +25% de XP para retomar el camino.',
      'El Santuario es tuyo. Explora a tu ritmo. ¡Nos vemos pronto!',
    ]);
    tutRunning = false;
    A.finishTutorial();
    sfx('levelup');
    go('santuario');
  }
}

function tutorialEvent(name) {
  const p = ctx().profile;
  if (name === 'mission-done' && p && !p.tutorial.done) {
    A.setTutorialStep(5);
    render();
  }
}

// ---------- Buzon de Venus (promociones, alertas cariñosas, quests) ----------
async function processInbox() {
  const c = ctx();
  const p = c.profile;
  if (!p || !p.tutorial.done || isVenusBusy() || modalOpen() || !p.venusInbox.length || STANDALONE[route()]) return;
  const msg = p.venusInbox[0];
  if (msg.kind === 'promotion') {
    const ok = await venusSay([msg.text], { choices: [{ label: '¡Sí, subamos!', value: true }, { label: 'Aún no', value: false }] });
    A.answerPromotion(msg.id, ok);
    if (ok) sfx('levelup');
  } else if (msg.kind === 'questFailed') {
    const retry = await venusSay([msg.text], { choices: [{ label: 'Reintentar', value: true }, { label: 'Más tarde', value: false }] });
    A.dismissMessage(msg.id);
    if (retry) A.retryQuest(msg.questId);
  } else {
    await venusSay([msg.text]);
    A.dismissMessage(msg.id);
  }
  render();
}

function afterRender() {
  runTutorial();
  processInbox();
}

// ---------- Arranque ----------
async function startGame() {
  const state = await store.hydrate(A.migrate);
  setSoundEnabled(state.settings.sound);
  // si se recargo justo despues de la mision tutorial, continuar con el cierre de Venus
  const p = state.profiles[state.activeProfileId];
  if (p && !p.tutorial.done && p.tutorial.step === 4 && p.inventory.includes('tunica_novicio')) A.setTutorialStep(5);
  render();
}

/** Tras iniciar sesion: las partidas se leen y guardan en la cuenta de Supabase. */
async function startWithSession(s) {
  session = s;
  store.setRepository(new cloud.SupabaseRepository(s));
  await startGame();
}

function askNewPassword() {
  const m = openModal(`
    <h2 class="title-sm">Nueva contraseña</h2>
    <label class="field"><span>Escribe tu nueva contraseña (mínimo 6 caracteres)</span><input type="password" class="new-pass" minlength="6"></label>
    <div class="row end"><button class="btn primary" data-ok>Guardar</button></div>`);
  m.el.querySelector('[data-ok]').addEventListener('click', async () => {
    try {
      await cloud.updatePassword(m.el.querySelector('.new-pass').value);
      m.close();
      toast('Contraseña actualizada.');
    } catch (err) {
      toast(`No se pudo cambiar: ${esc(err.message)}`);
    }
  });
}

async function boot() {
  await Promise.all([preloadAvatar(), loadBossTemplates()]);
  if (CLOUD_ENABLED) {
    cloud.onPasswordRecovery(askNewPassword);
    const s = await cloud.getSession().catch(() => null);
    if (s) await startWithSession(s);
    else render();
  } else {
    await startGame();
  }
  // la musica y el sensor de pasos (iOS) requieren un gesto del usuario para arrancar
  document.addEventListener('pointerdown', () => {
    const s = store.getState().settings;
    setMusic(s.music);
    if (s.stepSensor) enableStepSensor();
  }, { once: true });
  setInterval(() => {
    const p = ctx().profile;
    if (p && p.lastProcessedDate < today(p)) render();
  }, 60000);
  window.addEventListener('beforeunload', () => store.flush());
}
boot();
