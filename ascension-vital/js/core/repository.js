// Capa de persistencia. Hoy: localStorage. Fase 2: SupabaseRepository con la misma interfaz
// (load/save), de modo que el resto de la app no cambia.

export const STORAGE_KEY = 'ascension_vital_state_v1';

/** @implements {import('../../types/game').Repository} */
export class LocalRepository {
  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  async load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async save(state) {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (err) {
      console.warn('No se pudo guardar el estado local', err);
    }
  }
}
