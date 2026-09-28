// Reglas puras del juego (sin efectos): niveles, armonia, tiers, jefes, fechas.
import {
  PILLAR_IDS, TIER_LEVELS, EQUIPMENT, WALK_BOSSES, PROMOTION_DAYS, PHASE_ORDER, QUEST_FINISH_RATIO,
} from './content.js';

// ---------- Fechas (con desplazamiento de dias para Dev Controls) ----------
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function today(profile) {
  const d = new Date();
  d.setDate(d.getDate() + (profile?.devDayOffset ?? 0));
  return dateKey(d);
}
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}
export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da)) / 86400000);
}

// ---------- Niveles ----------
/** XP necesaria para pasar del nivel L al L+1. */
export const xpToNext = (level) => 100 + 50 * (level - 1);

export function levelInfo(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, current: remaining, needed: xpToNext(level), pct: remaining / xpToNext(level) };
}

export function pillarLevels(profile) {
  return Object.fromEntries(PILLAR_IDS.map((p) => [p, levelInfo(profile.pillarXp[p]).level]));
}

/**
 * Regla del cuello de botella: Nivel General = min(pilares) + Bono de Armonia.
 * Armonia: +1 si todos los pilares estan a 1 nivel o menos de distancia entre si.
 */
export function overall(profile) {
  const levels = Object.values(pillarLevels(profile));
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const harmonyBonus = max - min <= 1 ? 1 : 0;
  const weakest = PILLAR_IDS.filter((p) => levelInfo(profile.pillarXp[p]).level === min);
  return { overallLevel: min + harmonyBonus, harmonyBonus, min, max, weakest };
}

// ---------- Equipamiento Capa B ----------
export function tierForLevel(level) {
  let tier = 1;
  TIER_LEVELS.forEach((minLevel, i) => { if (level >= minLevel) tier = i + 1; });
  return tier;
}
/** @returns {import('../../types/game').EquipmentGear} */
export function gear(profile) {
  const lv = pillarLevels(profile);
  return {
    fisiologicaArmorTier: tierForLevel(lv.fisiologica),
    fisicaBootsTier: tierForLevel(lv.fisica),
    socialBagTier: tierForLevel(lv.social),
    autoestimaShieldTier: tierForLevel(lv.autoestima),
    conscienciaHelmTier: tierForLevel(lv.consciencia),
    prosperidadWeaponTier: tierForLevel(lv.prosperidad),
  };
}
export function tierOf(profile, pillar) {
  return tierForLevel(levelInfo(profile.pillarXp[pillar]).level);
}
export const equipmentSprite = (pillar, tier) => `assets/equipment/${EQUIPMENT[pillar].sprite}_t${tier}.png`;

// ---------- Jefes ----------
/** 5 estados de salud: 100%, 75%, 50%, 25%, 0% */
export function bossState(current, total) {
  if (current <= 0) return 4;
  const pct = current / total;
  if (pct > 0.75) return 0;
  if (pct > 0.5) return 1;
  if (pct > 0.25) return 2;
  return 3;
}

/** Estadisticas de una quest por tareas: minutos totales/hechos, avance y si se puede rematar. */
export function questTaskStats(quest, todayKey) {
  const totalMinutes = quest.tasks.reduce((a, t) => a + t.minutes, 0) || 1;
  const doneMinutes = quest.tasks.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const ratio = doneMinutes / totalMinutes;
  const pending = quest.tasks.some((t) => !t.done);
  const allDone = quest.tasks.length > 0 && !pending;
  const canFinish = quest.status === 'active' && pending && ratio >= QUEST_FINISH_RATIO;
  const daysLeft = daysBetween(todayKey, quest.targetDate);
  return { totalMinutes, doneMinutes, ratio, canFinish, allDone, daysLeft };
}

// ---------- Caminata ----------
export function walkBoss(profile) {
  return WALK_BOSSES[Math.min(profile.walk.level, WALK_BOSSES.length) - 1];
}

// ---------- Rampas de habitos ----------
export function habitStats(habit, todayKey) {
  const daysInPhase = daysBetween(habit.phaseStartDate, todayKey);
  const doneInPhase = habit.doneDates.filter((d) => d >= habit.phaseStartDate).length;
  const last = habit.doneDates.length ? habit.doneDates[habit.doneDates.length - 1] : habit.phaseStartDate;
  const inactiveDays = daysBetween(last, todayKey);
  const nextPhase = PHASE_ORDER[PHASE_ORDER.indexOf(habit.phase) + 1] ?? null;
  const promotable = !!nextPhase && daysInPhase >= PROMOTION_DAYS && doneInPhase >= Math.ceil(PROMOTION_DAYS * 0.6);
  return { daysInPhase, doneInPhase, inactiveDays, nextPhase, promotable, doneToday: habit.doneDates.includes(todayKey) };
}
export const habitDose = (habit) => habit.doses[PHASE_ORDER.indexOf(habit.phase)];
