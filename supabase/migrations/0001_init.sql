-- Money Flow OS — initial schema
-- Run this once in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/vlvdivviuxcspgxhvdhk/sql/new
-- Idempotent: safe to re-run.

----------------------------------------------------------------------
-- 1. profiles
----------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default 'Bạn',
  currency text not null default 'VND',
  active_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

----------------------------------------------------------------------
-- 2. transactions
----------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'saving', 'investment')),
  category text not null,
  amount numeric(18, 2) not null,
  note text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

alter table public.transactions enable row level security;

drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "tx_update_own" on public.transactions;
create policy "tx_update_own" on public.transactions
  for update using (auth.uid() = user_id);

drop policy if exists "tx_delete_own" on public.transactions;
create policy "tx_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

----------------------------------------------------------------------
-- 3. budget_items  (planned monthly budget tiles per category)
----------------------------------------------------------------------
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                -- 'YYYY-MM'
  category text not null check (category in ('income', 'needs', 'wants', 'savings')),
  name text not null,
  amount numeric(18, 2) not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists budget_user_month_idx
  on public.budget_items (user_id, month);

alter table public.budget_items enable row level security;

drop policy if exists "budget_select_own" on public.budget_items;
create policy "budget_select_own" on public.budget_items
  for select using (auth.uid() = user_id);

drop policy if exists "budget_insert_own" on public.budget_items;
create policy "budget_insert_own" on public.budget_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "budget_update_own" on public.budget_items;
create policy "budget_update_own" on public.budget_items
  for update using (auth.uid() = user_id);

drop policy if exists "budget_delete_own" on public.budget_items;
create policy "budget_delete_own" on public.budget_items
  for delete using (auth.uid() = user_id);

----------------------------------------------------------------------
-- 4. goals
----------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text default '🎯',
  target numeric(18, 2) not null default 0,
  saved numeric(18, 2) not null default 0,
  monthly_contribution numeric(18, 2) not null default 0,
  color text default 'var(--income)',
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id);

alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

----------------------------------------------------------------------
-- 5. rental_rooms
----------------------------------------------------------------------
create table if not exists public.rental_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rent numeric(18, 2) not null default 0,
  occupied boolean not null default false,
  tenant text,
  created_at timestamptz not null default now()
);

create index if not exists rooms_user_idx on public.rental_rooms (user_id);

alter table public.rental_rooms enable row level security;

drop policy if exists "rooms_select_own" on public.rental_rooms;
create policy "rooms_select_own" on public.rental_rooms
  for select using (auth.uid() = user_id);

drop policy if exists "rooms_insert_own" on public.rental_rooms;
create policy "rooms_insert_own" on public.rental_rooms
  for insert with check (auth.uid() = user_id);

drop policy if exists "rooms_update_own" on public.rental_rooms;
create policy "rooms_update_own" on public.rental_rooms
  for update using (auth.uid() = user_id);

drop policy if exists "rooms_delete_own" on public.rental_rooms;
create policy "rooms_delete_own" on public.rental_rooms
  for delete using (auth.uid() = user_id);

----------------------------------------------------------------------
-- 6. monthly_summary  (live view, no maintenance required)
----------------------------------------------------------------------
create or replace view public.monthly_summary as
select
  user_id,
  to_char(transaction_date, 'YYYY-MM') as month,
  sum(case when type = 'income'     then amount else 0 end) as total_income,
  sum(case when type = 'expense'    then amount else 0 end) as total_expense,
  sum(case when type = 'saving'     then amount else 0 end) as total_saving,
  sum(case when type = 'investment' then amount else 0 end) as total_investment,
  count(*) as transaction_count
from public.transactions
group by user_id, to_char(transaction_date, 'YYYY-MM');

----------------------------------------------------------------------
-- 7. handle_new_user trigger — auto-create profile on signup
----------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
