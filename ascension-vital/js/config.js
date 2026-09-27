// Configuracion de Supabase. Vacio = modo local (localStorage, sin cuenta).
// La clave "anon" es publica por diseño: la seguridad la dan las politicas RLS de supabase/schema.sql.
// NUNCA pongas aqui la clave "service_role".
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
