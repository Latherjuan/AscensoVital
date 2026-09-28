-- Ascension Vital: esquema de Supabase (pegar en SQL Editor > New query > Run).
-- Una fila por usuario con todo su AppState (perfiles/partidas) en jsonb.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Cada usuario solo ve y modifica su propia fila
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own" on public.app_state
  for delete using (auth.uid() = user_id);

-- Catalogo de jefes (Modulo 5): tabla de solo lectura publica para poder agregar jefes nuevos
-- (nombre, pilares, sprites) sin tocar codigo ni hacer deploy. Se edita a mano desde el
-- Table Editor de Supabase; no tiene politicas de insert/update/delete, asi que la app
-- (clave anon) nunca puede escribir aqui. Ver "Como agregar un jefe nuevo" en CONTEXTO_PROYECTO.md.
create table if not exists public.boss_templates (
  id text primary key,               -- identificador corto, ej. 'titan' (tambien nombre de carpeta de sprites)
  boss_name text not null,
  pillars text[] not null,           -- pilares por defecto al invocarlo, ej. {fisica,fisiologica}
  example text not null default '',  -- placeholder del campo "Tu reto"
  states text[] not null,            -- 5 etiquetas de estado (Sano...Disipado)
  sprite_base_url text,              -- null = usa los PNG locales assets/bosses/{id}_{0..4}.png
  sort_order int not null default 0,
  active boolean not null default true
);

alter table public.boss_templates enable row level security;

drop policy if exists "boss_templates_select_public" on public.boss_templates;
create policy "boss_templates_select_public" on public.boss_templates
  for select using (active = true);

insert into public.boss_templates (id, boss_name, pillars, example, states, sort_order) values
  ('titan', 'Titán de Roca y Musgo', array['fisica','fisiologica'], 'Rutina de movimiento',
    array['Sano','Grietas','Inclinado','Arrodillado','Colapsado en flor'], 1),
  ('dragon', 'Dragón de la Procrastinación', array['prosperidad','consciencia'], 'Preparar el examen / proyecto',
    array['Sano','Escamas sueltas','Alas rasgadas','Aliento débil','Estatua de luz'], 2),
  ('wraith', 'Espectro de la Carga Mental', array['consciencia','autoestima'], 'Soltar pendientes acumulados',
    array['Sano','Capa rasgada','Máscara rota','Desvaneciéndose','Disipado'], 3)
on conflict (id) do nothing;
