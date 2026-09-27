// Acciones del juego: mutan el estado a traves del store y devuelven eventos para la UI
// (xp ganada, subidas de nivel, cofres...). La UI decide como animarlos.
import {
  PILLAR_IDS, DEFAULT_HABITS, TUTORIAL_MISSION, BOSS_TEMPLATES, WALK_BOSSES, PHASES, PHASE_ORDER,
  HUMILITY_BONUS, HUMILITY_CHARGES, MAX_SHIELDS, INACTIVITY_DAYS, SPIRIT_PILLS, EQUIPMENT,
} from './content.js';
import {
  today, addDays, levelInfo, overall, questProgress, damagePerDose, walkBoss, habitStats, tierOf,
} from './rules.js';

let store;
export function bindStore(s) { store = s; }

const uid = () => Math.random().toString(36).slice(2, 10);
const active = (s) => s.profiles[s.activeProfileId];

export function initialState() {
  return { version: 1, activeProfileId: null, profiles: {}, settings: { sound: true, music: false } };
}

/** Rellena campos que falten en estados guardados por versiones anteriores del prototipo. */
export function migrate(saved) {
  const state = { ...initialState(), ...saved };
  for (const p of Object.values(state.profiles)) {
    p.venusInbox ??= [];
    p.inventory ??= [];
    p.devDayOffset ??= 0;
    p.lastActiveDate ??= null;
  }
  return state;
}

function newProfile(name, avatar) {
  const now = today(null);
  return {
    id: uid(),
    name: name.trim() || 'Viajero',
    createdAt: new Date().toISOString(),
    avatar,
    pillarXp: Object.fromEntries(PILLAR_IDS.map((p) => [p, 0])),
    streak: 0,
    bestStreak: 0,
    streakShields: 1,
    humilityCharges: 0,
    lastActiveDate: null,
    tutorial: { step: 0, done: false },
    inventory: [],
    habits: DEFAULT_HABITS.map((h) => ({
      id: uid(), title: h.title, pillar: h.pillar, doses: h.doses, phase: 'semilla', phaseStartDate: now, doneDates: [],
    })),
    quests: [],
    log: {},
    walk: { level: 1, pendingMinutes: 0 },
    venusInbox: [],
    lastProcessedDate: now,
    devDayOffset: 0,
  };
}

// ---------- Perfiles ----------
export function createProfile(name, avatar) {
  const profile = newProfile(name, avatar);
  store.update((s) => {
    s.profiles[profile.id] = profile;
    s.activeProfileId = profile.id;
  });
  return profile;
}
export function selectProfile(id) {
  store.update((s) => { s.activeProfileId = id; });
  return processDay();
}
export function logout() { store.update((s) => { s.activeProfileId = null; }); }
export function deleteProfile(id) {
  store.update((s) => {
    delete s.profiles[id];
    if (s.activeProfileId === id) s.activeProfileId = null;
  });
}
export function saveAvatar(avatar, name) {
  store.update((s) => {
    active(s).avatar = avatar;
    if (name?.trim()) active(s).name = name.trim();
  });
}
export function setSetting(key, value) { store.update((s) => { s.settings[key] = value; }); }

// ---------- XP ----------
function dayLog(p, day) {
  p.log[day] ??= { missions: [], xp: 0, walkMinutes: 0, spiritPills: [] };
  return p.log[day];
}

function markActive(p, day) {
  if (p.lastActiveDate === day) return;
  p.streak = p.lastActiveDate === addDays(day, -1) ? p.streak + 1 : 1;
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  p.lastActiveDate = day;
}

/** Otorga XP a un pilar aplicando el Multiplicador de Humildad si hay cargas. */
function grantXp(p, pillar, base, events, { humility = true } = {}) {
  const before = levelInfo(p.pillarXp[pillar]).level;
  const overallBefore = overall(p).overallLevel;
  const tierBefore = tierOf(p, pillar);
  let amount = base;
  let humble = false;
  if (humility && p.humilityCharges > 0) {
    amount = Math.round(base * (1 + HUMILITY_BONUS));
    p.humilityCharges--;
    humble = true;
  }
  p.pillarXp[pillar] += amount;
  const day = today(p);
  dayLog(p, day).xp += amount;
  markActive(p, day);
  events.xp.push({ pillar, amount, humble });
  const after = levelInfo(p.pillarXp[pillar]).level;
  if (after > before) events.pillarLevelUps.push({ pillar, level: after });
  const tierAfter = tierOf(p, pillar);
  if (tierAfter > tierBefore) events.newGear.push({ pillar, tier: tierAfter, name: EQUIPMENT[pillar].tiers[tierAfter - 1] });
  const overallAfter = overall(p).overallLevel;
  if (overallAfter > overallBefore) events.overallLevelUp = overallAfter;
}

const emptyEvents = () => ({ xp: [], pillarLevelUps: [], newGear: [], overallLevelUp: null, chest: null, messages: [] });

function act(recipe) {
  const events = emptyEvents();
  store.update((s) => recipe(active(s), events, s));
  return events;
}

// ---------- Tutorial (Modulo 0) ----------
export function setTutorialStep(step) {
  store.update((s) => { active(s).tutorial.step = step; });
}
export function completeTutorialMission() {
  return act((p, ev) => {
    if (p.inventory.includes('tunica_novicio')) return;
    grantXp(p, TUTORIAL_MISSION.pillar, TUTORIAL_MISSION.xp, ev, { humility: false });
    dayLog(p, today(p)).missions.push(TUTORIAL_MISSION.id);
    p.inventory.push('tunica_novicio');
    ev.chest = { item: 'Túnica del Novicio' };
  });
}
export function finishTutorial() {
  store.update((s) => { active(s).tutorial = { step: 99, done: true }; });
}
export function restartTutorial() {
  store.update((s) => { active(s).tutorial = { step: 0, done: false }; });
}

// ---------- Misiones / habitos (Modulos 4) ----------
export function completeHabit(habitId) {
  return act((p, ev) => {
    const habit = p.habits.find((h) => h.id === habitId);
    const day = today(p);
    if (!habit || habit.doneDates.includes(day)) return;
    habit.doneDates.push(day);
    dayLog(p, day).missions.push(habit.id);
    grantXp(p, habit.pillar, PHASES[habit.phase].xp, ev);
  });
}
export function addHabit({ title, pillar, doses }) {
  store.update((s) => {
    active(s).habits.push({ id: uid(), title, pillar, doses, phase: 'semilla', phaseStartDate: today(active(s)), doneDates: [] });
  });
}
export function removeHabit(habitId) {
  store.update((s) => { active(s).habits = active(s).habits.filter((h) => h.id !== habitId); });
}
/** Respuesta a Venus sobre la promocion de fase. */
export function answerPromotion(messageId, accept) {
  store.update((s) => {
    const p = active(s);
    const msg = p.venusInbox.find((m) => m.id === messageId);
    p.venusInbox = p.venusInbox.filter((m) => m.id !== messageId);
    const habit = p.habits.find((h) => h.id === msg?.habitId);
    if (!habit) return;
    const t = today(p);
    if (accept) {
      habit.phase = PHASE_ORDER[PHASE_ORDER.indexOf(habit.phase) + 1] ?? habit.phase;
      habit.phaseStartDate = t;
    } else {
      habit.promotionSnoozedUntil = addDays(t, 3);
    }
  });
}
export function dismissMessage(messageId) {
  store.update((s) => { active(s).venusInbox = active(s).venusInbox.filter((m) => m.id !== messageId); });
}

// ---------- Autocompasion (Modulo 3) ----------
/** Un desliz reflexionado no resta XP ni rompe la racha: da humildad y recarga escudo. */
export function reportSlip() {
  return act((p) => {
    const day = today(p);
    dayLog(p, day).slipReflected = true;
    markActive(p, day);
    p.humilityCharges = HUMILITY_CHARGES;
    p.streakShields = Math.min(MAX_SHIELDS, p.streakShields + 1);
  });
}
export function completeSpiritPill(pillId) {
  return act((p, ev) => {
    const pill = SPIRIT_PILLS.find((x) => x.id === pillId);
    const log = dayLog(p, today(p));
    if (!pill || log.spiritPills.includes(pillId)) return;
    log.spiritPills.push(pillId);
    grantXp(p, 'consciencia', pill.xp, ev);
  });
}
export function completeMeditation(minutes) {
  return act((p, ev) => {
    dayLog(p, today(p)).spiritPills.push(`meditacion-${Date.now()}`);
    grantXp(p, 'consciencia', 15 + minutes * 5, ev);
  });
}

// ---------- Caminata (Modulo 2) ----------
export function addWalkMinutes(minutes) {
  store.update((s) => { active(s).walk.pendingMinutes += minutes; });
}
/** Aplica los minutos acumulados en segundo plano como rafaga de golpes. */
export function applyPendingWalk() {
  return act((p, ev) => {
    const minutes = p.walk.pendingMinutes;
    if (!minutes) return;
    const day = today(p);
    const log = dayLog(p, day);
    const boss = walkBoss(p);
    const before = log.walkMinutes;
    log.walkMinutes += minutes;
    p.walk.pendingMinutes = 0;
    ev.walk = { hits: minutes, before, after: log.walkMinutes, boss };
    grantXp(p, 'fisica', minutes, ev, { humility: false });
    if (p.walk.defeatedOn !== day && log.walkMinutes >= boss.minutes) {
      p.walk.defeatedOn = day;
      p.walk.defeatedLevel = boss.level;
      ev.walk.defeated = true;
      grantXp(p, 'fisica', 20 + boss.level * 10, ev);
      if (p.walk.level < WALK_BOSSES.length) p.walk.level++;
      ev.chest = { item: `Botín del ${boss.name}` };
    }
  });
}

// ---------- Quests y jefes (Modulo 5) ----------
export function createQuest({ kind, title, days, dosesPerDay }) {
  const tpl = BOSS_TEMPLATES[kind];
  store.update((s) => {
    const p = active(s);
    p.quests.unshift({
      id: uid(), title: title || tpl.example, bossName: tpl.bossName, bossKind: kind,
      bossTotalHp: 100 * days, bossCurrentHp: 100 * days, status: 'active', pillars: tpl.pillars,
      days, dosesPerDay, startDate: today(p), doseLog: {},
    });
  });
}
export function applyDose(questId) {
  return act((p, ev) => {
    const q = p.quests.find((x) => x.id === questId);
    const day = today(p);
    if (!q || q.status !== 'active') return;
    const prog = questProgress(q, day);
    if (prog.todayDoses >= q.dosesPerDay || day > prog.endDate) return;
    q.doseLog[day] = prog.todayDoses + 1;
    const dmg = Math.min(q.bossCurrentHp, damagePerDose(q));
    q.bossCurrentHp -= dmg;
    ev.damage = dmg;
    q.pillars.forEach((pillar) => grantXp(p, pillar, 8, ev));
    if (q.bossCurrentHp <= 0) defeatQuest(p, q, ev);
  });
}
/** Remate final: disponible con >= 80% de dosis cumplidas. */
export function finishingBlow(questId) {
  return act((p, ev) => {
    const q = p.quests.find((x) => x.id === questId);
    if (!q || !questProgress(q, today(p)).canFinish) return;
    ev.damage = q.bossCurrentHp;
    q.bossCurrentHp = 0;
    defeatQuest(p, q, ev);
  });
}
function defeatQuest(p, q, ev) {
  q.status = 'completed';
  const reward = 40 * q.days;
  q.pillars.forEach((pillar) => grantXp(p, pillar, Math.round(reward / q.pillars.length), ev));
  ev.chest = { item: `Tesoro de ${q.bossName}` };
  ev.defeated = true;
}
export function retryQuest(questId) {
  store.update((s) => {
    const p = active(s);
    const q = p.quests.find((x) => x.id === questId);
    if (!q) return;
    Object.assign(q, { status: 'active', bossCurrentHp: q.bossTotalHp, startDate: today(p), doseLog: {} });
    p.venusInbox = p.venusInbox.filter((m) => m.questId !== questId);
  });
}
export function removeQuest(questId) {
  store.update((s) => {
    const p = active(s);
    p.quests = p.quests.filter((q) => q.id !== questId);
    p.venusInbox = p.venusInbox.filter((m) => m.questId !== questId);
  });
}

// ---------- Cambio de dia ----------
/**
 * Procesa los dias transcurridos desde la ultima visita: escudos de racha, quests vencidas,
 * promociones de habito (Venus pregunta a las 2 semanas) y alertas cariñosas de inactividad.
 */
export function processDay() {
  return act((p) => {
    const t = today(p);
    if (p.lastProcessedDate >= t) return;
    // Racha: cada dia vacio consume un escudo o reinicia la racha (sin restar XP nunca)
    let shieldsUsed = 0;
    let streakLost = false;
    for (let d = addDays(p.lastActiveDate ?? t, 1); d < t && p.streak > 0; d = addDays(d, 1)) {
      if (p.streakShields > 0) {
        p.streakShields--;
        p.lastActiveDate = d;
        shieldsUsed++;
      } else {
        p.streak = 0;
        streakLost = true;
      }
    }
    if (shieldsUsed) pushMsg(p, 'info', `${shieldsUsed === 1 ? 'Un Escudo de Racha te protegió un día' : `${shieldsUsed} Escudos de Racha te protegieron ${shieldsUsed} días`} sin actividad. Descansar también es parte del camino. 💗`);
    if (streakLost) pushMsg(p, 'info', 'Tu racha se reinició, y está bien. No perdiste nada de lo aprendido: todo tu XP sigue contigo. ¿Empezamos de nuevo con algo pequeño?');
    for (const q of p.quests) {
      const prog = questProgress(q, t);
      if (q.status === 'active' && t > prog.endDate && !prog.canFinish) {
        q.status = 'failed';
        pushMsg(p, 'questFailed', `${q.bossName} se retiró a descansar... y tú también mereces hacerlo. Lograste ${prog.done} de ${prog.totalDoses} dosis. ¿Lo intentamos otra vez con un ritmo más amable?`, { questId: q.id });
      }
    }
    const dormant = [];
    for (const h of p.habits) {
      const st = habitStats(h, t);
      const pending = p.venusInbox.some((m) => m.habitId === h.id && m.kind === 'promotion');
      if (st.promotable && !pending && (!h.promotionSnoozedUntil || t >= h.promotionSnoozedUntil)) {
        pushMsg(p, 'promotion', `Llevas ${st.daysInPhase} días cultivando «${h.title}» (${st.doneInPhase} veces). ¿Te sientes lista/o para pasar a ${PHASES[st.nextPhase].name}?`, { habitId: h.id });
      }
      if (st.inactiveDays >= INACTIVITY_DAYS && (!h.lastInactivityAlert || h.lastInactivityAlert <= addDays(t, -INACTIVITY_DAYS))) {
        h.lastInactivityAlert = t;
        dormant.push(h.title);
      }
    }
    // Alerta cariñosa agrupada: un solo mensaje aunque varios habitos lleven 7+ dias sin visita
    if (dormant.length) {
      const list = dormant.length <= 3 ? dormant.map((x) => `«${x}»`).join(', ') : `${dormant.length} de tus hábitos`;
      pushMsg(p, 'inactivity', `Hace una semana o más que no visitamos ${list}. No pasa nada: las semillas siguen ahí esperándote. ¿Qué tal una dosis mínima hoy?`);
    }
    p.lastProcessedDate = t;
  });
}
function pushMsg(p, kind, text, extra = {}) {
  p.venusInbox.push({ id: uid(), kind, text, ...extra });
}

// ---------- Dev Controls ----------
export function devAdvanceDays(n) {
  store.update((s) => { active(s).devDayOffset += n; });
  return processDay();
}
/** Simula 14 dias cumpliendo todos los habitos (para probar la promocion de fase de Venus). */
export function devSimulateConsistentDays(n = 14) {
  store.update((s) => {
    const p = active(s);
    const start = today(p);
    for (let i = 0; i < n; i++) {
      const d = addDays(start, i);
      const log = dayLog(p, d);
      for (const h of p.habits) {
        if (!h.doneDates.includes(d)) h.doneDates.push(d);
        if (!log.missions.includes(h.id)) log.missions.push(h.id);
      }
      markActive(p, d);
    }
    p.lastProcessedDate = addDays(start, n - 1);
    p.devDayOffset += n;
  });
  return processDay();
}
export function devAddXp(pillar, amount) {
  return act((p, ev) => grantXp(p, pillar, amount, ev, { humility: false }));
}
export function devReset() {
  store.update((s) => {
    const p = active(s);
    const fresh = newProfile(p.name, p.avatar);
    s.profiles[p.id] = { ...fresh, id: p.id };
  });
}
