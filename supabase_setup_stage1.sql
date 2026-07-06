-- Matchday Manager V4 Stage 1 Supabase setup
-- Run this in Supabase SQL Editor.
-- It makes players/settings safe per logged-in user.

alter table public.players
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.app_settings
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.players alter column active set default true;
alter table public.players alter column available set default false;
alter table public.players alter column paid set default false;
alter table public.players alter column rating set default 3;

alter table public.players enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "players_select_own" on public.players;
drop policy if exists "players_insert_own" on public.players;
drop policy if exists "players_update_own" on public.players;
drop policy if exists "players_delete_own" on public.players;

create policy "players_select_own" on public.players
for select using (auth.uid() = user_id);

create policy "players_insert_own" on public.players
for insert with check (auth.uid() = user_id);

create policy "players_update_own" on public.players
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "players_delete_own" on public.players
for delete using (auth.uid() = user_id);

drop policy if exists "settings_select_own" on public.app_settings;
drop policy if exists "settings_insert_own" on public.app_settings;
drop policy if exists "settings_update_own" on public.app_settings;
drop policy if exists "settings_delete_own" on public.app_settings;

create policy "settings_select_own" on public.app_settings
for select using (auth.uid() = user_id);

create policy "settings_insert_own" on public.app_settings
for insert with check (auth.uid() = user_id);

create policy "settings_update_own" on public.app_settings
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "settings_delete_own" on public.app_settings
for delete using (auth.uid() = user_id);

create or replace function public.set_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_players_user_id on public.players;
create trigger set_players_user_id
before insert on public.players
for each row execute function public.set_user_id();

drop trigger if exists set_settings_user_id on public.app_settings;
create trigger set_settings_user_id
before insert on public.app_settings
for each row execute function public.set_user_id();
