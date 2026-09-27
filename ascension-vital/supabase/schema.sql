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
