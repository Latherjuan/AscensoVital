// Store minimo al estilo Zustand (getState / setState / subscribe) con persistencia
// delegada al repositorio. Las mutaciones trabajan sobre un borrador clonado.

export function createStore(initialState, repository) {
  let state = initialState;
  const listeners = new Set();
  let saveTimer = null;

  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => repository.save(state), 150);
  };

  return {
    /** Cambia la persistencia (ej. LocalRepository -> SupabaseRepository al iniciar sesion). */
    setRepository(repo) { repository = repo; },
    async hydrate(migrate) {
      const saved = await repository.load();
      if (saved) state = migrate(saved);
      return state;
    },
    getState: () => state,
    /** @param {(draft: any) => void} recipe */
    update(recipe) {
      const draft = structuredClone(state);
      recipe(draft);
      state = draft;
      persist();
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Guarda ya (sin esperar el debounce), incluida la escritura remota si la hay. */
    flush: async () => {
      clearTimeout(saveTimer);
      await repository.save(state);
      await repository.flushRemote?.();
    },
  };
}
