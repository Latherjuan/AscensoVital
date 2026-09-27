// Capa de nube (Fase 2): autenticacion de Supabase + SupabaseRepository.
// Implementa la misma interfaz que LocalRepository (load/save), asi que el resto de la app no cambia.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { LocalRepository, STORAGE_KEY } from './repository.js';

let client = null;

async function getClient() {
  if (!client) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

export async function getSession() {
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/** Devuelve la sesion, o null si Supabase exige confirmar el correo primero. */
export async function signUp(email, password) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` },
  });
  if (error) throw error;
  return data.session;
}

export async function resetPassword(email) {
  const sb = await getClient();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
  if (error) throw error;
}

/** Al abrir el enlace de "restablecer contraseña", Supabase emite PASSWORD_RECOVERY. */
export async function onPasswordRecovery(callback) {
  const sb = await getClient();
  sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') callback(); });
}

export async function updatePassword(password) {
  const sb = await getClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut();
}

/**
 * Guarda el AppState completo en la fila del usuario (tabla app_state).
 * Mantiene una copia local por usuario para arrancar rapido y resistir cortes de red.
 * @implements {import('../../types/game').Repository}
 */
export class SupabaseRepository {
  constructor(session) {
    this.userId = session.user.id;
    this.cache = new LocalRepository(`${STORAGE_KEY}_${this.userId}`);
    this.timer = null;
    this.pending = null;
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flushRemote(); });
  }

  async load() {
    const sb = await getClient();
    const { data, error } = await sb.from('app_state').select('state').eq('user_id', this.userId).maybeSingle();
    if (error) {
      console.warn('Sin conexion con Supabase; usando copia local', error);
      return this.cache.load();
    }
    if (data) {
      await this.cache.save(data.state);
      return data.state;
    }
    // Primera vez con esta cuenta: se suben las partidas jugadas en modo local
    const legacy = await new LocalRepository().load();
    if (legacy && Object.keys(legacy.profiles ?? {}).length) {
      await this.writeRemote(legacy);
      return legacy;
    }
    return null;
  }

  async save(state) {
    await this.cache.save(state);
    this.pending = state;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flushRemote(), 1000);
  }

  flushRemote() {
    clearTimeout(this.timer);
    if (!this.pending) return Promise.resolve();
    const state = this.pending;
    this.pending = null;
    return this.writeRemote(state);
  }

  async writeRemote(state) {
    const sb = await getClient();
    const { error } = await sb.from('app_state').upsert({ user_id: this.userId, state, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('No se pudo guardar en Supabase; se reintentara', error);
      this.pending ??= state;
    }
  }
}
