// Catalogo de jefes: usa la tabla remota `boss_templates` si hay conexion, y si no (modo local,
// sin sesion, o fallo de red) cae en DEFAULT_BOSS_TEMPLATES. Asi el equipo de arte puede agregar
// jefes nuevos (sprites en un bucket de Storage + una fila en la tabla) sin tocar codigo.
import { DEFAULT_BOSS_TEMPLATES } from './content.js';
import { CLOUD_ENABLED } from '../config.js';
import { fetchBossTemplates } from '../core/cloud.js';

let templates = { ...DEFAULT_BOSS_TEMPLATES };

export function bossTemplates() {
  return templates;
}

export async function loadBossTemplates() {
  if (!CLOUD_ENABLED) return;
  try {
    const rows = await fetchBossTemplates();
    if (!rows?.length) return;
    templates = Object.fromEntries(rows.map((r) => [r.id, {
      bossName: r.boss_name,
      pillars: r.pillars,
      example: r.example,
      states: r.states,
      spriteBaseUrl: r.sprite_base_url ?? null,
    }]));
  } catch (err) {
    console.warn('No se pudo cargar el catálogo de jefes remoto; usando el local', err);
  }
}
