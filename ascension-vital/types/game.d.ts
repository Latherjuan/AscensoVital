// Tipos del dominio (seccion 2 del documento). El codigo JS los referencia via JSDoc;
// al migrar a Supabase/TypeScript se reutilizan tal cual.

export type PillarId = 'fisica' | 'fisiologica' | 'social' | 'autoestima' | 'consciencia' | 'prosperidad';
export type HabitPhase = 'semilla' | 'consolidacion' | 'maestria';
export type BossKind = 'titan' | 'dragon' | 'wraith';

/** Capa A: identidad base editable. */
export interface AvatarLayerA {
  skinTone: number; // 1-6
  hairStyle: number; // 0 (calvo) - 8
  hairColor: number; // 1-6
  facialFeature: number; // 0-6
  baseTunicColor: number; // 1-3
}

/** Valores derivados que la UI muestra (se calculan, no se guardan). */
export interface UserStats extends AvatarLayerA {
  overallLevel: number;
  harmonyBonus: number;
  streakShields: number;
}

/** Capa B: tiers derivados del nivel de cada pilar. */
export interface EquipmentGear {
  fisiologicaArmorTier: number; // 1-4
  fisicaBootsTier: number; // 1-4
  socialBagTier: number; // 1-4
  autoestimaShieldTier: number; // 1-4
  conscienciaHelmTier: number; // 1-4
  prosperidadWeaponTier: number; // 1-4
}

export interface Quest {
  id: string;
  title: string;
  bossName: string;
  bossKind: BossKind;
  bossTotalHp: number; // 100 HP por dia de duracion
  bossCurrentHp: number;
  status: 'active' | 'completed' | 'failed';
  pillars: PillarId[];
  days: number;
  dosesPerDay: number;
  startDate: string; // YYYY-MM-DD
  doseLog: Record<string, number>;
}

export interface Habit {
  id: string;
  title: string;
  pillar: PillarId;
  doses: [string, string, string]; // dosis por fase
  phase: HabitPhase;
  phaseStartDate: string;
  doneDates: string[];
  promotionSnoozedUntil?: string;
  lastInactivityAlert?: string;
}

export interface DayLog {
  missions: string[]; // ids de habitos completados
  xp: number;
  walkMinutes: number;
  slipReflected?: boolean;
  spiritPills?: string[];
}

export interface VenusMessage {
  id: string;
  kind: 'info' | 'promotion' | 'inactivity' | 'questFailed';
  text: string;
  habitId?: string;
  questId?: string;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  avatar: AvatarLayerA;
  pillarXp: Record<PillarId, number>;
  streak: number;
  bestStreak: number;
  streakShields: number;
  humilityCharges: number;
  tutorial: { step: number; done: boolean };
  inventory: string[]; // ej. 'tunica_novicio'
  habits: Habit[];
  quests: Quest[];
  log: Record<string, DayLog>;
  walk: { level: number; pendingMinutes: number; defeatedOn?: string };
  venusInbox: VenusMessage[];
  lastProcessedDate: string;
  devDayOffset: number;
}

export interface AppState {
  version: 1;
  activeProfileId: string | null;
  profiles: Record<string, Profile>;
  settings: { sound: boolean; music: boolean };
}

/** Contrato de persistencia: LocalRepository hoy, SupabaseRepository despues. */
export interface Repository {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}
