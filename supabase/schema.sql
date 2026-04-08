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
  category text not null default '',
  tags jsonb not null default '[]'::jsonb,
  goal_frequency integer not null default 0,
  reminder jsonb not null default '{"enabled":false,"time":"08:00"}'::jsonb,
  skip_rule text not null default 'break' check (skip_rule in ('break', 'protect')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  linked_playlist_id text not null default '',
  order_index bigint not null default 0,
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
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  mood text not null default '',
  playlist_id text not null default '',
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, date)
);

alter table public.habits add column if not exists category text not null default '';
alter table public.habits add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.habits add column if not exists goal_frequency integer not null default 0;
alter table public.habits add column if not exists reminder jsonb not null default '{"enabled":false,"time":"08:00"}'::jsonb;
alter table public.habits add column if not exists skip_rule text not null default 'break';
alter table public.habits add column if not exists priority text not null default 'medium';
alter table public.habits add column if not exists linked_playlist_id text not null default '';
alter table public.habits add column if not exists order_index bigint not null default 0;
alter table public.entries add column if not exists status text not null default 'pending';
alter table public.entries add column if not exists mood text not null default '';
alter table public.entries add column if not exists playlist_id text not null default '';
alter table public.entries add column if not exists completed_at timestamptz null;

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

create table if not exists public.habit_sessions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz null,
  playlist_id text not null default '',
  success boolean not null default false,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_sessions_user_id_idx on public.habit_sessions(user_id);
create index if not exists habit_sessions_habit_id_idx on public.habit_sessions(habit_id);
create index if not exists habit_sessions_start_time_idx on public.habit_sessions(start_time desc);

create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood text not null default '',
  notes text not null default '',
  wins text not null default '',
  misses text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_reviews_user_id_idx on public.daily_reviews(user_id);
create index if not exists daily_reviews_date_idx on public.daily_reviews(date desc);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null default '',
  completion_rate double precision not null default 0,
  best_habit_id uuid null references public.habits(id) on delete set null,
  worst_habit_id uuid null references public.habits(id) on delete set null,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_reviews_user_id_idx on public.weekly_reviews(user_id);
create index if not exists weekly_reviews_week_start_idx on public.weekly_reviews(week_start desc);

alter table public.habits enable row level security;
alter table public.entries enable row level security;
alter table public.projects enable row level security;
alter table public.settings enable row level security;
alter table public.habit_sessions enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.weekly_reviews enable row level security;

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

-- Habit sessions policies
drop policy if exists "habit_sessions_select_own" on public.habit_sessions;
create policy "habit_sessions_select_own" on public.habit_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "habit_sessions_insert_own" on public.habit_sessions;
create policy "habit_sessions_insert_own" on public.habit_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "habit_sessions_update_own" on public.habit_sessions;
create policy "habit_sessions_update_own" on public.habit_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "habit_sessions_delete_own" on public.habit_sessions;
create policy "habit_sessions_delete_own" on public.habit_sessions for delete
  using (auth.uid() = user_id);

-- Daily reviews policies
drop policy if exists "daily_reviews_select_own" on public.daily_reviews;
create policy "daily_reviews_select_own" on public.daily_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "daily_reviews_insert_own" on public.daily_reviews;
create policy "daily_reviews_insert_own" on public.daily_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_reviews_update_own" on public.daily_reviews;
create policy "daily_reviews_update_own" on public.daily_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_reviews_delete_own" on public.daily_reviews;
create policy "daily_reviews_delete_own" on public.daily_reviews for delete
  using (auth.uid() = user_id);

-- Weekly reviews policies
drop policy if exists "weekly_reviews_select_own" on public.weekly_reviews;
create policy "weekly_reviews_select_own" on public.weekly_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "weekly_reviews_insert_own" on public.weekly_reviews;
create policy "weekly_reviews_insert_own" on public.weekly_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "weekly_reviews_update_own" on public.weekly_reviews;
create policy "weekly_reviews_update_own" on public.weekly_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weekly_reviews_delete_own" on public.weekly_reviews;
create policy "weekly_reviews_delete_own" on public.weekly_reviews for delete
  using (auth.uid() = user_id);
