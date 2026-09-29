// Acciones del juego: mutan el estado a traves del store y devuelven eventos para la UI
// (xp ganada, subidas de nivel, cofres...). La UI decide como animarlos.
import {
  PILLAR_IDS, DEFAULT_HABITS, TUTORIAL_MISSION, PHASES, PHASE_ORDER,
  HUMILITY_BONUS, HUMILITY_CHARGES, MAX_SHIELDS, INACTIVITY_DAYS, SPIRIT_PILLS, EQUIPMENT,
  QUEST_DEFEAT_BONUS, EARLY_FINISH_BONUS, TASK_XP_PER_MINUTE, SOCIAL_XP, SOCIAL_MAX_XP_PER_DAY,
} from './content.js';
import {
  today, addDays, daysBetween, levelInfo, overall, questTaskStats, walkDailyBosses, bestWalkCombo,
  habitStats, tierOf,
} from './rules.js';
import { bossTemplates } from './bossCatalog.js';

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
    p.contacts ??= [];
    p.interactions ??= [];
    // El sistema de jefes paso de dosis diarias a tareas con tiempo asignado: las quests del
    // formato viejo (sin `tasks`) no son compatibles y se descartan al cargar.
    const before = p.quests ?? [];
    p.quests = before.filter((q) => Array.isArray(q.tasks));
    if (p.quests.length !== before.length) {
      const keepIds = new Set(p.quests.map((q) => q.id));
      p.venusInbox = p.venusInbox.filter((m) => !m.questId || keepIds.has(m.questId));
    }
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
    contacts: [],
    interactions: [],
    log: {},
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

// ---------- Caminata (Modulo 2): varios rivales del dia, se resuelve al cerrar el dia ----------
/**
 * Registra minutos caminados (sensor o Dev Controls): suma directo al dia y da 1 XP/min.
 * Ademas informa en `ev.walkHit` que rivales entrarian ahora en la mejor combinacion posible
 * (vista previa en vivo; el vencimiento real se confirma al cerrar el dia en processDay).
 */
export function addWalkMinutes(minutes) {
  return act((p, ev) => {
    const log = dayLog(p, today(p));
    const bosses = walkDailyBosses();
    const before = bestWalkCombo(bosses, log.walkMinutes);
    log.walkMinutes += minutes;
    grantXp(p, 'fisica', minutes, ev, { humility: false });
    const after = bestWalkCombo(bosses, log.walkMinutes);
    const newlyBeaten = after.ids.filter((id) => !before.ids.includes(id));
    ev.walkHit = { minutes, newlyBeaten };
  });
}

// ---------- Social: contactos con avatar + interacciones por WhatsApp / llamada ----------
/** Deja solo digitos (formato internacional sin '+', como pide wa.me). */
export const cleanPhone = (raw) => String(raw ?? '').replace(/\D/g, '');

export function saveContact({ id = null, name, phone, avatar }) {
  const contact = { id: id ?? uid(), name: name.trim(), phone: cleanPhone(phone), avatar: { ...avatar } };
  store.update((s) => {
    const p = active(s);
    const i = p.contacts.findIndex((c) => c.id === contact.id);
    if (i >= 0) p.contacts[i] = { ...p.contacts[i], ...contact };
    else p.contacts.push({ ...contact, createdAt: new Date().toISOString() });
  });
  return contact;
}
export function removeContact(id) {
  store.update((s) => { active(s).contacts = active(s).contacts.filter((c) => c.id !== id); });
}

/**
 * Registra una interaccion social ('message' | 'call'). Da XP de Social solo la primera vez
 * por contacto y tipo cada dia, con tope diario, para que no se pueda farmear. Siempre queda en
 * el historial (`p.interactions`).
 */
export function logInteraction(contactId, kind) {
  return act((p, ev) => {
    const contact = p.contacts.find((c) => c.id === contactId);
    if (!contact || !SOCIAL_XP[kind]) return;
    const day = today(p);
    const todays = p.interactions.filter((i) => i.date === day);
    const repeated = todays.some((i) => i.contactId === contactId && i.kind === kind && i.xp > 0);
    const earnedToday = todays.reduce((n, i) => n + i.xp, 0);
    const xp = repeated ? 0 : Math.max(0, Math.min(SOCIAL_XP[kind], SOCIAL_MAX_XP_PER_DAY - earnedToday));
    p.interactions.push({ id: uid(), contactId, kind, date: day, at: new Date().toISOString(), xp });
    p.interactions = p.interactions.slice(-500);
    if (xp > 0) grantXp(p, 'social', xp, ev);
    ev.interaction = { xp, repeated, capped: !repeated && xp === 0 };
  });
}

// ---------- Quests y jefes (Modulo 5): tareas con tiempo asignado, no dosis diarias ----------
export function createQuest({ kind, title, pillars, targetDate, tasks }) {
  const tpl = bossTemplates()[kind];
  const chosenPillars = pillars?.length ? pillars : tpl.pillars;
  store.update((s) => {
    const p = active(s);
    p.quests.unshift({
      id: uid(), title: title || tpl.example, bossName: tpl.bossName, bossKind: kind,
      status: 'active', pillars: chosenPillars, startDate: today(p), targetDate,
      tasks: tasks.map((t) => ({ id: uid(), title: t.title, minutes: t.minutes, done: false, doneAt: null })),
    });
  });
}
export function addQuestTask(questId, { title, minutes }) {
  store.update((s) => {
    const q = active(s).quests.find((x) => x.id === questId);
    if (!q || q.status !== 'active') return;
    q.tasks.push({ id: uid(), title, minutes, done: false, doneAt: null });
  });
}
/** Solo se pueden quitar tareas pendientes: una tarea ya hecha ya otorgo su XP y su golpe. */
export function removeQuestTask(questId, taskId) {
  store.update((s) => {
    const q = active(s).quests.find((x) => x.id === questId);
    if (!q) return;
    q.tasks = q.tasks.filter((t) => t.id !== taskId || t.done);
  });
}
export function completeQuestTask(questId, taskId) {
  return act((p, ev) => {
    const q = p.quests.find((x) => x.id === questId);
    const task = q?.tasks.find((t) => t.id === taskId);
    if (!q || !task || task.done || q.status !== 'active') return;
    const before = questTaskStats(q, today(p));
    task.done = true;
    task.doneAt = today(p);
    const after = questTaskStats(q, today(p));
    ev.damage = Math.round((after.ratio - before.ratio) * 100);
    const xp = task.minutes * TASK_XP_PER_MINUTE;
    q.pillars.forEach((pillar) => grantXp(p, pillar, Math.round(xp / q.pillars.length), ev));
    if (after.allDone) defeatQuest(p, q, ev, after);
  });
}
/** Remate final: disponible con >= 80% del tiempo cumplido; las tareas pendientes quedan sin hacer. */
export function finishingBlow(questId) {
  return act((p, ev) => {
    const q = p.quests.find((x) => x.id === questId);
    const stats = q && questTaskStats(q, today(p));
    if (!stats?.canFinish) return;
    ev.damage = Math.round((1 - stats.ratio) * 100);
    defeatQuest(p, q, ev, stats);
  });
}
function defeatQuest(p, q, ev, stats) {
  q.status = 'completed';
  const early = today(p) < q.targetDate;
  const reward = Math.round(stats.totalMinutes * QUEST_DEFEAT_BONUS * (early ? 1 + EARLY_FINISH_BONUS : 1));
  q.pillars.forEach((pillar) => grantXp(p, pillar, Math.round(reward / q.pillars.length), ev));
  ev.chest = { item: `Tesoro de ${q.bossName}` };
  ev.defeated = true;
  ev.early = early;
}
export function retryQuest(questId) {
  store.update((s) => {
    const p = active(s);
    const q = p.quests.find((x) => x.id === questId);
    if (!q) return;
    const span = Math.max(1, daysBetween(q.startDate, q.targetDate));
    const start = today(p);
    Object.assign(q, {
      status: 'active', startDate: start, targetDate: addDays(start, span),
      tasks: q.tasks.map((t) => ({ ...t, done: false, doneAt: null })),
    });
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

// ---------- Backup y restauracion ----------
/** Copia completa del estado (todas las partidas de este dispositivo/cuenta), lista para descargar. */
export function exportBackup() {
  return structuredClone(store.getState());
}
/** Reemplaza el estado completo por uno restaurado desde un archivo de backup. */
export function importBackup(data) {
  const migrated = migrate(data);
  store.update((s) => {
    Object.keys(s).forEach((k) => delete s[k]);
    Object.assign(s, migrated);
  });
}

// ---------- Cambio de dia ----------
/**
 * Procesa los dias transcurridos desde la ultima visita: escudos de racha, quests vencidas,
 * promociones de habito (Venus pregunta a las 2 semanas) y alertas cariñosas de inactividad.
 */
export function processDay() {
  return act((p, ev) => {
    const t = today(p);
    if (p.lastProcessedDate >= t) return;
    // Caminata: resuelve cada dia ya cerrado (el subconjunto de rivales de mayor valor que
    // alcancen los minutos caminados ese dia), una sola vez, y lo deja fijo en el historial.
    const walkBosses = walkDailyBosses();
    const defeatedNames = [];
    for (let d = p.lastProcessedDate; d < t; d = addDays(d, 1)) {
      const log = p.log[d];
      if (!log || log.walkDefeated || !walkBosses.length) continue;
      const combo = bestWalkCombo(walkBosses, log.walkMinutes ?? 0);
      log.walkDefeated = combo.ids;
      combo.ids.forEach((id) => {
        const boss = walkBosses.find((b) => b.id === id);
        grantXp(p, 'fisica', boss.minutes, ev);
        defeatedNames.push(boss.bossName);
      });
    }
    if (defeatedNames.length) ev.chest = { item: `Botín de: ${defeatedNames.join(', ')}` };
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
      const stats = questTaskStats(q, t);
      if (q.status === 'active' && t > q.targetDate && !stats.canFinish) {
        q.status = 'failed';
        pushMsg(p, 'questFailed', `${q.bossName} se retiró a descansar... y tú también mereces hacerlo. Lograste ${stats.doneMinutes} de ${stats.totalMinutes} min. ¿Lo intentamos otra vez con un ritmo más amable?`, { questId: q.id });
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
