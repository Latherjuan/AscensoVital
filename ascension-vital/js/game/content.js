// Catalogo estatico del juego: pilares, equipamiento, habitos base, jefes y textos de Venus.

/** @type {import('../../types/game').PillarId[]} */
export const PILLAR_IDS = ['fisica', 'fisiologica', 'social', 'autoestima', 'consciencia', 'prosperidad'];

export const PILLARS = {
  fisica: { name: 'Física', short: 'FIS', color: '#e0703a', desc: 'Movimiento, fuerza y caminata diaria.' },
  fisiologica: { name: 'Fisiológica', short: 'FIO', color: '#d8373f', desc: 'Hidratación, nutrición vegetal, sueño y ritmos.' },
  social: { name: 'Social', short: 'SOC', color: '#d9b48a', desc: 'Vínculos, llamadas y escucha empática.' },
  autoestima: { name: 'Autoestima', short: 'AUT', color: '#b8c0cc', desc: 'Autocuidado, orden, límites y valor propio.' },
  consciencia: { name: 'Consciencia', short: 'CON', color: '#4aa8ff', desc: 'Enfoque, carga mental y píldoras espirituales.' },
  prosperidad: { name: 'Prosperidad', short: 'PRO', color: '#f2c84b', desc: 'Finanzas, carrera y trabajo profundo.' },
};

// Mapeo 1:1 Capa B (seccion 4 del documento)
export const EQUIPMENT = {
  fisiologica: { slot: 'Armadura', sprite: 'armor', tiers: ['Tela gastada', 'Cuero endurecido', 'Cota de malla', 'Placas de oro sagradas'] },
  fisica: { slot: 'Botas', sprite: 'boots', tiers: ['Sandalias de lino', 'Botas de cuero', 'Grebas de hierro', 'Botas titánicas aladas'] },
  social: { slot: 'Morral', sprite: 'bag', tiers: ['Zurrón de tela', 'Morral explorador', 'Mochila comunitaria', 'Mochila mística con orbes'] },
  autoestima: { slot: 'Escudo', sprite: 'shield', tiers: ['Broquel de madera', 'Escudo de bronce', 'Escudo de acero', 'Escudo espejo de dignidad'] },
  consciencia: { slot: 'Casco', sprite: 'helm', tiers: ['Vincha de lino', 'Diadema de bronce', 'Casco ceremonial', 'Aureola y corona mística'] },
  prosperidad: { slot: 'Arma', sprite: 'weapon', tiers: ['Daga', 'Espada corta', 'Espada ancha', 'Cetro del creador'] },
};

/** Nivel de pilar minimo para cada tier (1-4). */
export const TIER_LEVELS = [1, 3, 6, 10];

export const PHASES = {
  semilla: { name: 'Semilla', icon: '🌱', xp: 20 },
  consolidacion: { name: 'Consolidación', icon: '🌿', xp: 30 },
  maestria: { name: 'Maestría', icon: '🌳', xp: 45 },
};
export const PHASE_ORDER = ['semilla', 'consolidacion', 'maestria'];
export const PROMOTION_DAYS = 14;
export const INACTIVITY_DAYS = 7;

/** Habitos iniciales de cada perfil (Modulo 4: dosis por fase). */
export const DEFAULT_HABITS = [
  { title: 'Estiramientos', pillar: 'fisica', doses: ['5 estiramientos', '10 min de movilidad', '20 min de fuerza'] },
  { title: 'Hidratación', pillar: 'fisiologica', doses: ['4 vasos de agua', '6 vasos de agua', '8 vasos de agua'] },
  { title: 'Comida basada en plantas', pillar: 'fisiologica', doses: ['1 comida vegetal', '2 comidas vegetales', 'Todo el día vegetal'] },
  { title: 'Conectar con alguien', pillar: 'social', doses: ['Enviar un mensaje cariñoso', 'Llamar a un ser querido', 'Llamada con escucha empática (15 min)'] },
  { title: 'Ordenar mi espacio', pillar: 'autoestima', doses: ['5 min de orden', '15 min de orden', 'Espacio completo en orden'] },
  { title: 'Planificar el día', pillar: 'consciencia', doses: ['Escribir 3 prioridades', 'Plan + descarga mental', 'Plan semanal estratégico'] },
  { title: 'Trabajo profundo', pillar: 'prosperidad', doses: ['15 min de Deep Work', '45 min de Deep Work', '90 min de Deep Work'] },
];

export const TUTORIAL_MISSION = { id: 'tutorial', title: '5 estiramientos', pillar: 'fisica', xp: 25 };

/**
 * Plantillas de jefe para quests (Modulo 5), usadas como respaldo cuando no hay conexion con
 * Supabase (modo local, sin sesion, o fallo de red). Con conexion, el catalogo real viene de la
 * tabla `boss_templates` (ver js/game/bossCatalog.js) para poder agregar jefes nuevos sin tocar
 * codigo. Sprites en assets/bosses/{kind}_{0-4}.png.
 */
export const DEFAULT_BOSS_TEMPLATES = {
  titan: {
    bossName: 'Titán de Roca y Musgo', pillars: ['fisica', 'fisiologica'],
    example: 'Rutina de movimiento', states: ['Sano', 'Grietas', 'Inclinado', 'Arrodillado', 'Colapsado en flor'],
  },
  dragon: {
    bossName: 'Dragón de la Procrastinación', pillars: ['prosperidad', 'consciencia'],
    example: 'Preparar el examen / proyecto', states: ['Sano', 'Escamas sueltas', 'Alas rasgadas', 'Aliento débil', 'Estatua de luz'],
  },
  wraith: {
    bossName: 'Espectro de la Carga Mental', pillars: ['consciencia', 'autoestima'],
    example: 'Soltar pendientes acumulados', states: ['Sano', 'Capa rasgada', 'Máscara rota', 'Desvaneciéndose', 'Disipado'],
  },
};

/** Quest por tareas (Modulo 5): 1 XP por minuto asignado, remate final al 80% del tiempo hecho,
 *  recompensa extra al vencerlo, y bono si se termina antes de la fecha objetivo. */
export const TASK_XP_PER_MINUTE = 1;
export const QUEST_FINISH_RATIO = 0.8;
export const QUEST_DEFEAT_BONUS = 0.6;
export const EARLY_FINISH_BONUS = 0.15;

/** Modulo 2 (Caminata): los rivales del dia son los boss_templates del pilar 'fisica'.
 *  Cada uno recibe un costo en minutos segun su posicion: base + i*paso (ver walkDailyBosses
 *  en rules.js), asi que agregar un fisica-boss nuevo en Supabase suma un rival mas sin tocar
 *  codigo. Se resuelve una vez al dia: se vence el subconjunto de mayor valor que alcancen los
 *  minutos caminados (bestWalkCombo en rules.js), no solo "el primero que se alcance". */
export const WALK_BASE_MINUTES = 10;
export const WALK_STEP_MINUTES = 10;
export const STEPS_PER_MINUTE = 100;

export const HOOPONOPONO = ['Lo siento', 'Perdóname', 'Gracias', 'Te amo'];
export const TRIGGER_WORD = 'flor de loto';
export const HUMILITY_BONUS = 0.25;
export const HUMILITY_CHARGES = 3;
export const MAX_SHIELDS = 3;

export const SPIRIT_PILLS = [
  { id: 'oracion', title: 'Oración', xp: 15, prompt: 'Dedica un momento a agradecer o pedir por alguien. ¿Por quién o por qué oras hoy?' },
  { id: 'introspeccion', title: 'Introspección', xp: 20, prompt: '¿Qué emoción predominó hoy y qué necesitaba de ti?' },
  { id: 'gratitud', title: 'Gratitud', xp: 15, prompt: 'Escribe tres cosas pequeñas que agradeces hoy.' },
];

export const AVATAR_OPTIONS = {
  skinTone: { label: 'Piel', min: 1, max: 6 },
  hairStyle: { label: 'Peinado', min: 0, max: 8 },
  hairColor: { label: 'Tinte', min: 1, max: 6 },
  facialFeature: { label: 'Rasgo', min: 0, max: 6 },
  baseTunicColor: { label: 'Túnica', min: 1, max: 3 },
};
export const HAIR_STYLE_NAMES = ['Calvo', 'Despeinado', 'Largo liso', 'Largo salvaje', 'Coleta', 'Melena', 'Rizado corto', 'Afro', 'Media melena'];
export const HAIR_COLOR_NAMES = ['Castaño', 'Rubio', 'Pelirrojo', 'Negro', 'Azul', 'Plata'];
export const FEATURE_NAMES = ['Ninguno', 'Gafas', 'Barba', 'Pecas', 'Cicatriz', 'Bigote', 'Gafas y barba'];
export const TUNIC_NAMES = ['Marrón', 'Verde', 'Azul'];
