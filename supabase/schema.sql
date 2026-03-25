-- Habit Tracker schema for Supabase (Postgres)
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('binary', 'quantity')),
  color text not null default '#7c5cff',
  unit text not null default '',
  target integer not null default 1,
  schedule jsonb not null default '{"kind":"daily"}'::jsonb,
  notes text not null default '',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits(user_id);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

create index if not exists entries_user_id_idx on public.entries(user_id);
create index if not exists entries_habit_id_idx on public.entries(habit_id);
create index if not exists entries_date_idx on public.entries(date);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text not null default '',
  why text not null default '',
  start_date date null,
  target_date date null,
  milestones jsonb not null default '[]'::jsonb,
  habit_ids uuid[] not null default '{}'::uuid[],
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

create table if not exists public.settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists settings_user_id_idx on public.settings(user_id);

alter table public.habits enable row level security;
alter table public.entries enable row level security;
alter table public.projects enable row level security;
alter table public.settings enable row level security;

-- Habits policies
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits for select
  using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits for insert
  with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits for delete
  using (auth.uid() = user_id);

-- Entries policies
drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries for delete
  using (auth.uid() = user_id);

-- Projects policies
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects for delete
  using (auth.uid() = user_id);

-- Settings policies
drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own" on public.settings for select
  using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own" on public.settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own" on public.settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_delete_own" on public.settings for delete
  using (auth.uid() = user_id);

