// Configuracion de Supabase. Vacio = modo local (localStorage, sin cuenta).
// La clave "anon" es publica por diseño: la seguridad la dan las politicas RLS de supabase/schema.sql.
// NUNCA pongas aqui la clave "service_role".
export const SUPABASE_URL = 'https://vjfgshondpbcbwqgucqd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZmdzaG9uZHBiY2J3cWd1Y3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTI0MTcsImV4cCI6MjEwNjA2ODQxN30.9ax3Wkw1GLgLP7VZ2RPdCn732ak_ZwZn3_tohu6Hd8o';

export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
