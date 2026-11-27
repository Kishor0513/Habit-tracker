-- LifeOS additive migration. Safe to run more than once.
-- Run after supabase/schema.sql. Existing habit data is untouched.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled task',
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'none',
  due_date date null,
  start_date date null,
  project_id uuid null references public.projects(id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  subtasks jsonb not null default '[]'::jsonb,
  order_index bigint not null default 0,
  completed_at timestamptz null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_project_id_idx on public.tasks(project_id);

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Notes',
  color text not null default '#7c3aed',
  order_index bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists note_folders_user_id_idx on public.note_folders(user_id);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  plain_text text not null default '',
  folder_id uuid null references public.note_folders(id) on delete set null,
  tags jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  favorite boolean not null default false,
  archived_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_folder_id_idx on public.notes(folder_id);
create index if not exists notes_updated_at_idx on public.notes(updated_at desc);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Account',
  type text not null default 'checking',
  currency text not null default 'NPR',
  opening_balance_minor bigint not null default 0,
  color text not null default '#7c3aed',
  note text not null default '',
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts(user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null default 'expense',
  amount_minor bigint not null default 0,
  currency text not null default 'NPR',
  category text not null default 'Other',
  date date not null,
  description text not null default '',
  to_account_id uuid null references public.accounts(id) on delete set null,
  transfer_group_id text not null default '',
  recurring_id text not null default '',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_date_idx on public.transactions(date desc);
create index if not exists transactions_recurring_idx on public.transactions(recurring_id, date);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'Other',
  amount_minor bigint not null default 0,
  period text not null default 'monthly',
  start_date date null,
  end_date date null,
  currency text not null default 'NPR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budgets_user_id_idx on public.budgets(user_id);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null default 'expense',
  amount_minor bigint not null default 0,
  currency text not null default 'NPR',
  category text not null default 'Other',
  description text not null default '',
  frequency text not null default 'monthly',
  interval integer not null default 1,
  start_date date not null,
  end_date date null,
  next_date date null,
  to_account_id uuid null references public.accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recurring_user_id_idx on public.recurring_transactions(user_id);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Savings goal',
  target_minor bigint not null default 0,
  current_minor bigint not null default 0,
  currency text not null default 'NPR',
  deadline date null,
  color text not null default '#7c3aed',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists savings_goals_user_id_idx on public.savings_goals(user_id);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Client',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  tax_id text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on public.clients(user_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null default '',
  client_id uuid null references public.clients(id) on delete set null,
  issue_date date null,
  due_date date null,
  status text not null default 'draft',
  currency text not null default 'NPR',
  tax_rate_bps integer not null default 0,
  discount_minor bigint not null default 0,
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount_minor bigint not null default 0,
  currency text not null default 'NPR',
  date date not null,
  method text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoice_payments_user_id_idx on public.invoice_payments(user_id);
create index if not exists invoice_payments_invoice_id_idx on public.invoice_payments(invoice_id);

create table if not exists public.life_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Uniform, user-scoped RLS for all new tables.
do $$
declare
  table_name text;
begin
  for table_name in
    select unnest(array[
      'tasks', 'note_folders', 'notes', 'accounts', 'transactions', 'budgets',
      'recurring_transactions', 'savings_goals', 'clients', 'invoices',
      'invoice_payments', 'life_settings'
    ])
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;

-- Enable live client updates for the user's data when Supabase Realtime is available.
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'habits', 'entries', 'projects', 'tasks', 'notes', 'note_folders',
      'accounts', 'transactions', 'budgets', 'recurring_transactions',
      'savings_goals', 'clients', 'invoices', 'invoice_payments',
      'life_settings', 'settings', 'habit_sessions', 'daily_reviews',
      'weekly_reviews'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
